import { createMachine } from 'xstate';

export const fulfillmentMachine = createMachine({
  id: 'enterpriseFulfillment',
  description:
    'Import-friendly warehouse fulfillment workflow for testing Stately Studio GitHub import.',
  initial: 'intake',
  context: {
    orderId: null,
    riskScore: 0,
    pickExceptions: 0,
    labelAttempts: 0,
  },
  on: {
    CUSTOMER_CANCELS: {
      target: '.cancelled',
      actions: 'recordCustomerCancellation',
    },
    OPS_FORCE_FAIL: {
      target: '.failed',
      actions: 'recordOperationalFailure',
    },
  },
  states: {
    intake: {
      description: 'Receive, validate, and approve an order.',
      initial: 'received',
      states: {
        received: {
          entry: 'recordOrderReceived',
          on: {
            VALIDATE_ORDER: 'validating',
          },
        },
        validating: {
          on: {
            ORDER_VALID: 'riskCheck',
            ORDER_INVALID: 'rejected',
          },
        },
        riskCheck: {
          on: {
            LOW_RISK: 'accepted',
            HIGH_RISK: 'manualFraudReview',
          },
        },
        manualFraudReview: {
          on: {
            APPROVE_RISK: 'accepted',
            REJECT_RISK: 'rejected',
          },
        },
        accepted: {
          type: 'final',
          entry: 'publishOrderAccepted',
        },
        rejected: {
          type: 'final',
          entry: 'publishOrderRejected',
        },
      },
      onDone: [
        {
          guard: 'orderWasRejected',
          target: 'failed',
        },
        {
          target: 'planning',
        },
      ],
    },
    planning: {
      description:
        'Reserve inventory and authorize payment in parallel before warehouse work starts.',
      type: 'parallel',
      states: {
        inventory: {
          initial: 'checkingAvailability',
          states: {
            checkingAvailability: {
              on: {
                INVENTORY_AVAILABLE: 'reservingStock',
                INVENTORY_SHORT: 'waitingForReplenishment',
                INVENTORY_LOOKUP_FAILED: 'inventoryServiceUnavailable',
              },
            },
            inventoryServiceUnavailable: {
              after: {
                3000: 'checkingAvailability',
              },
            },
            waitingForReplenishment: {
              on: {
                STOCK_REPLENISHED: 'checkingAvailability',
                BACKORDER_TIMEOUT: '#enterpriseFulfillment.failed',
              },
            },
            reservingStock: {
              on: {
                STOCK_RESERVED: 'reserved',
                RESERVATION_CONFLICT: 'reservationConflict',
              },
            },
            reservationConflict: {
              on: {
                RECHECK_INVENTORY: 'checkingAvailability',
                CANCEL_ORDER: '#enterpriseFulfillment.cancelled',
              },
            },
            reserved: {
              type: 'final',
            },
          },
        },
        payment: {
          initial: 'authorizing',
          states: {
            authorizing: {
              on: {
                PAYMENT_AUTHORIZED: 'authorized',
                PAYMENT_ACTION_REQUIRED: 'requiresCustomerAction',
              },
            },
            requiresCustomerAction: {
              on: {
                CUSTOMER_UPDATED_PAYMENT: 'authorizing',
                PAYMENT_WINDOW_EXPIRED: '#enterpriseFulfillment.cancelled',
              },
            },
            authorized: {
              type: 'final',
            },
          },
        },
      },
      onDone: {
        target: 'picking',
        actions: 'publishReadyToPick',
      },
    },
    picking: {
      description: 'Assign warehouse work and resolve scan exceptions.',
      initial: 'waveQueued',
      states: {
        waveQueued: {
          on: {
            WAVE_RELEASED: 'assigningPicker',
          },
        },
        assigningPicker: {
          on: {
            PICKER_ASSIGNED: 'inProgress',
            PICKER_ASSIGNMENT_FAILED: 'supervisorReview',
          },
        },
        inProgress: {
          initial: 'scanningLocation',
          states: {
            scanningLocation: {
              on: {
                LOCATION_CONFIRMED: 'scanningItem',
                WRONG_LOCATION: 'exception',
              },
            },
            scanningItem: {
              on: {
                ITEM_SCANNED: [
                  {
                    guard: 'allRequiredItemsScanned',
                    target: 'complete',
                  },
                  {
                    target: 'scanningLocation',
                  },
                ],
                ITEM_DAMAGED: 'exception',
              },
            },
            exception: {
              on: {
                SUBSTITUTE_APPROVED: 'scanningLocation',
                ESCALATE_TO_SUPERVISOR:
                  '#enterpriseFulfillment.picking.supervisorReview',
              },
            },
            complete: {
              type: 'final',
              entry: 'publishPickComplete',
            },
          },
          onDone: 'picked',
        },
        supervisorReview: {
          on: {
            RESOLVE_PICK_EXCEPTION: 'inProgress',
            ABORT_PICK: '#enterpriseFulfillment.failed',
          },
        },
        picked: {
          type: 'final',
        },
      },
      onDone: 'qualityGate',
    },
    qualityGate: {
      description: 'Validate picked goods before packing.',
      initial: 'awaitingScan',
      states: {
        awaitingScan: {
          on: {
            QA_SCAN_STARTED: 'checking',
          },
        },
        checking: {
          on: {
            QA_PASSED: 'passed',
            QA_FAILED: 'manualReview',
          },
        },
        manualReview: {
          on: {
            QA_OVERRIDE_APPROVED: 'passed',
            QA_REWORK_REQUIRED: '#enterpriseFulfillment.picking',
            QA_REJECTED: '#enterpriseFulfillment.failed',
          },
        },
        passed: {
          type: 'final',
        },
      },
      onDone: 'packing',
    },
    packing: {
      description: 'Prepare parcel and documents in parallel.',
      type: 'parallel',
      states: {
        parcel: {
          initial: 'selectingCarton',
          states: {
            selectingCarton: {
              on: {
                CARTON_SELECTED: 'packingItems',
              },
            },
            packingItems: {
              on: {
                PARCEL_SEALED: 'sealed',
              },
            },
            sealed: {
              type: 'final',
            },
          },
        },
        documents: {
          initial: 'checkingRequirements',
          states: {
            checkingRequirements: {
              on: {
                DOCUMENTS_REQUIRED: 'generatingDocuments',
                DOCUMENTS_NOT_REQUIRED: 'ready',
              },
            },
            generatingDocuments: {
              on: {
                DOCUMENTS_READY: 'ready',
                DOCUMENTS_FAILED: '#enterpriseFulfillment.failed',
              },
            },
            ready: {
              type: 'final',
            },
          },
        },
      },
      onDone: {
        target: 'shipping',
        actions: 'publishPacked',
      },
    },
    shipping: {
      description: 'Buy a label, wait for pickup, and track delivery.',
      initial: 'selectingCarrier',
      states: {
        selectingCarrier: {
          on: {
            CARRIER_SELECTED: 'purchasingLabel',
            CARRIER_SELECTION_FAILED: 'manualCarrierSelection',
          },
        },
        manualCarrierSelection: {
          on: {
            CARRIER_SELECTED: 'purchasingLabel',
          },
        },
        purchasingLabel: {
          on: {
            LABEL_PURCHASED: 'awaitingPickup',
            LABEL_PURCHASE_FAILED: 'labelRetryDelay',
          },
        },
        labelRetryDelay: {
          after: {
            5000: 'purchasingLabel',
          },
        },
        awaitingPickup: {
          on: {
            CARRIER_SCANNED_PARCEL: 'inTransit',
            PICKUP_MISSED: 'reschedulingPickup',
          },
        },
        reschedulingPickup: {
          on: {
            PICKUP_RESCHEDULED: 'awaitingPickup',
            PICKUP_RESCHEDULE_FAILED: '#enterpriseFulfillment.failed',
          },
        },
        inTransit: {
          on: {
            DELIVERY_CONFIRMED: 'delivered',
            DELIVERY_EXCEPTION: 'deliveryException',
          },
        },
        deliveryException: {
          on: {
            RESOLVE_DELIVERY_EXCEPTION: 'inTransit',
            RETURN_TO_SENDER: '#enterpriseFulfillment.failed',
          },
        },
        delivered: {
          type: 'final',
        },
      },
      onDone: 'completed',
    },
    completed: {
      type: 'final',
      entry: 'publishFulfillmentComplete',
    },
    cancelled: {
      type: 'final',
      entry: 'releaseHeldResources',
    },
    failed: {
      type: 'final',
      entry: 'openOpsIncident',
    },
  },
});

