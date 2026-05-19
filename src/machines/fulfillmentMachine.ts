import { createMachine } from 'xstate';

export const fulfillmentMachine = createMachine({
  id: 'enterpriseFulfillment',
  description:
    'A complex warehouse fulfillment workflow for testing Stately Studio import from GitHub.',
  initial: 'intake',
  context: {
    orderId: null,
    riskScore: 0,
    reservedSkuCount: 0,
    pickExceptions: 0,
    labelPurchaseAttempts: 0,
    carrier: null,
  },
  on: {
    CUSTOMER_CANCELS: {
      target: '.cancelled',
      actions: ['recordCustomerCancellation', 'releaseAnyHeldResources'],
    },
    OPS_FORCE_FAIL: {
      target: '.failed',
      actions: ['recordOperationalFailure', 'notifyIncidentChannel'],
    },
  },
  states: {
    intake: {
      description: 'Capture, normalize, and risk-check the incoming order.',
      initial: 'received',
      states: {
        received: {
          entry: ['assignOrderId', 'recordOrderReceived'],
          on: {
            VALIDATE_ORDER: {
              target: 'validating',
              actions: 'normalizeOrderPayload',
            },
          },
        },
        validating: {
          invoke: {
            src: 'validateOrder',
            input: ({ context }) => ({ orderId: context.orderId }),
            onDone: [
              {
                guard: 'hasHighRiskScore',
                target: 'manualFraudReview',
                actions: 'storeValidationResult',
              },
              {
                target: 'accepted',
                actions: 'storeValidationResult',
              },
            ],
            onError: {
              target: 'rejected',
              actions: 'storeValidationError',
            },
          },
        },
        manualFraudReview: {
          description: 'Human approval lane for suspicious orders.',
          on: {
            APPROVE_RISK: {
              target: 'accepted',
              actions: 'recordRiskApproval',
            },
            REJECT_RISK: {
              target: 'rejected',
              actions: 'recordRiskRejection',
            },
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
        'Reserve sellable stock and authorize payment in parallel before warehouse work starts.',
      type: 'parallel',
      states: {
        inventory: {
          initial: 'checkingAvailability',
          states: {
            checkingAvailability: {
              invoke: {
                src: 'checkInventory',
                onDone: [
                  {
                    guard: 'allItemsAvailable',
                    target: 'reservingStock',
                    actions: 'storeAvailableInventory',
                  },
                  {
                    target: 'waitingForReplenishment',
                    actions: 'createBackorderRequest',
                  },
                ],
                onError: {
                  target: 'inventoryServiceUnavailable',
                  actions: 'recordInventoryLookupFailure',
                },
              },
            },
            inventoryServiceUnavailable: {
              after: {
                RETRY_INVENTORY_LOOKUP: {
                  target: 'checkingAvailability',
                  actions: 'incrementInventoryLookupRetry',
                },
              },
            },
            waitingForReplenishment: {
              on: {
                STOCK_REPLENISHED: {
                  target: 'checkingAvailability',
                  actions: 'recordReplenishment',
                },
                BACKORDER_TIMEOUT: {
                  target: '#enterpriseFulfillment.failed',
                  actions: 'notifyBackorderExpired',
                },
              },
            },
            reservingStock: {
              invoke: {
                src: 'reserveInventory',
                onDone: {
                  target: 'reserved',
                  actions: 'storeReservation',
                },
                onError: {
                  target: 'reservationConflict',
                  actions: 'recordReservationConflict',
                },
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
              invoke: {
                src: 'authorizePayment',
                onDone: {
                  target: 'authorized',
                  actions: 'storePaymentAuthorization',
                },
                onError: {
                  target: 'requiresCustomerAction',
                  actions: 'requestPaymentUpdate',
                },
              },
            },
            requiresCustomerAction: {
              on: {
                CUSTOMER_UPDATED_PAYMENT: {
                  target: 'authorizing',
                  actions: 'storeUpdatedPaymentMethod',
                },
                PAYMENT_WINDOW_EXPIRED: {
                  target: '#enterpriseFulfillment.cancelled',
                  actions: 'recordPaymentWindowExpired',
                },
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
      description: 'Warehouse execution lane for assigning and completing pick work.',
      initial: 'waveQueued',
      states: {
        waveQueued: {
          on: {
            WAVE_RELEASED: {
              target: 'assigningPicker',
              actions: 'attachWaveId',
            },
          },
        },
        assigningPicker: {
          invoke: {
            src: 'assignPicker',
            onDone: {
              target: 'inProgress',
              actions: 'storePickerAssignment',
            },
            onError: {
              target: 'supervisorReview',
              actions: 'recordPickerAssignmentFailure',
            },
          },
        },
        inProgress: {
          initial: 'scanningLocation',
          states: {
            scanningLocation: {
              on: {
                LOCATION_CONFIRMED: 'scanningItem',
                WRONG_LOCATION: {
                  target: 'exception',
                  actions: 'recordWrongLocationScan',
                },
              },
            },
            scanningItem: {
              on: {
                ITEM_SCANNED: [
                  {
                    guard: 'allRequiredItemsScanned',
                    target: 'complete',
                    actions: 'recordFinalItemScan',
                  },
                  {
                    target: 'scanningLocation',
                    actions: 'recordItemScan',
                  },
                ],
                ITEM_DAMAGED: {
                  target: 'exception',
                  actions: 'recordDamagedItem',
                },
              },
            },
            exception: {
              on: {
                SUBSTITUTE_APPROVED: {
                  target: 'scanningLocation',
                  actions: 'applySubstitution',
                },
                ESCALATE_TO_SUPERVISOR: '#enterpriseFulfillment.picking.supervisorReview',
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
            RESOLVE_PICK_EXCEPTION: {
              target: 'inProgress',
              actions: 'recordSupervisorResolution',
            },
            ABORT_PICK: {
              target: '#enterpriseFulfillment.failed',
              actions: 'recordPickAbort',
            },
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
          invoke: {
            src: 'runQualityInspection',
            onDone: [
              {
                guard: 'qualityInspectionPassed',
                target: 'passed',
                actions: 'recordQualityPass',
              },
              {
                target: 'manualReview',
                actions: 'recordQualityIssue',
              },
            ],
          },
        },
        manualReview: {
          on: {
            QA_OVERRIDE_APPROVED: {
              target: 'passed',
              actions: 'recordQualityOverride',
            },
            QA_REWORK_REQUIRED: {
              target: '#enterpriseFulfillment.picking',
              actions: 'sendBackToPicking',
            },
            QA_REJECTED: {
              target: '#enterpriseFulfillment.failed',
              actions: 'recordQualityRejection',
            },
          },
        },
        passed: {
          type: 'final',
        },
      },
      onDone: 'packing',
    },
    packing: {
      description:
        'Prepare parcel materials and compliance documents in parallel before buying a label.',
      type: 'parallel',
      states: {
        parcel: {
          initial: 'selectingCarton',
          states: {
            selectingCarton: {
              on: {
                CARTON_SELECTED: {
                  target: 'packingItems',
                  actions: 'storeCartonChoice',
                },
              },
            },
            packingItems: {
              on: {
                PARCEL_SEALED: {
                  target: 'sealed',
                  actions: 'recordParcelWeight',
                },
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
              always: [
                {
                  guard: 'requiresCustomsDocuments',
                  target: 'generatingCustomsDocs',
                },
                {
                  target: 'ready',
                },
              ],
            },
            generatingCustomsDocs: {
              invoke: {
                src: 'generateCustomsDocuments',
                onDone: {
                  target: 'ready',
                  actions: 'storeDocumentIds',
                },
                onError: {
                  target: '#enterpriseFulfillment.failed',
                  actions: 'recordDocumentGenerationFailure',
                },
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
      description: 'Buy a carrier label, hand over the parcel, and track delivery.',
      initial: 'selectingCarrier',
      states: {
        selectingCarrier: {
          invoke: {
            src: 'selectCarrier',
            onDone: {
              target: 'purchasingLabel',
              actions: 'storeCarrier',
            },
            onError: {
              target: 'manualCarrierSelection',
              actions: 'recordCarrierSelectionFailure',
            },
          },
        },
        manualCarrierSelection: {
          on: {
            CARRIER_SELECTED: {
              target: 'purchasingLabel',
              actions: 'storeManualCarrier',
            },
          },
        },
        purchasingLabel: {
          invoke: {
            src: 'purchaseShippingLabel',
            onDone: {
              target: 'awaitingPickup',
              actions: 'storePurchasedLabel',
            },
            onError: [
              {
                guard: 'canRetryLabelPurchase',
                target: 'labelRetryDelay',
                actions: 'recordLabelPurchaseRetry',
              },
              {
                target: 'manualCarrierSelection',
                actions: 'recordLabelPurchaseFailure',
              },
            ],
          },
        },
        labelRetryDelay: {
          after: {
            RETRY_LABEL_PURCHASE: 'purchasingLabel',
          },
        },
        awaitingPickup: {
          on: {
            CARRIER_SCANNED_PARCEL: {
              target: 'inTransit',
              actions: 'recordCarrierHandoff',
            },
            PICKUP_MISSED: {
              target: 'reschedulingPickup',
              actions: 'recordMissedPickup',
            },
          },
        },
        reschedulingPickup: {
          invoke: {
            src: 'reschedulePickup',
            onDone: {
              target: 'awaitingPickup',
              actions: 'storePickupWindow',
            },
            onError: {
              target: '#enterpriseFulfillment.failed',
              actions: 'recordPickupRescheduleFailure',
            },
          },
        },
        inTransit: {
          on: {
            DELIVERY_CONFIRMED: {
              target: 'delivered',
              actions: 'recordDelivery',
            },
            DELIVERY_EXCEPTION: {
              target: 'deliveryException',
              actions: 'recordDeliveryException',
            },
          },
        },
        deliveryException: {
          on: {
            RESOLVE_DELIVERY_EXCEPTION: {
              target: 'inTransit',
              actions: 'recordDeliveryExceptionResolution',
            },
            RETURN_TO_SENDER: {
              target: '#enterpriseFulfillment.failed',
              actions: 'recordReturnToSender',
            },
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
      entry: ['capturePayment', 'publishFulfillmentComplete'],
    },
    cancelled: {
      type: 'final',
      entry: ['voidPaymentAuthorization', 'releaseInventoryReservation'],
    },
    failed: {
      type: 'final',
      entry: ['openOpsIncident', 'releaseAnyHeldResources'],
    },
  },
});

