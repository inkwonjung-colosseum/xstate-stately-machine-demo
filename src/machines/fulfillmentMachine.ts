import { createMachine } from 'xstate';

export const fulfillmentMachine = createMachine({
  id: 'enterpriseFulfillment',
  description:
    'Detailed warehouse fulfillment workflow for Stately Studio simulation and GitHub import testing.',
  initial: 'intake',
  context: {
    orderId: null,
    customerId: null,
    waveId: null,
    parcelId: null,
    labelAttempts: 0,
    exceptionCount: 0,
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
      description:
        'Capture the order, normalize it, validate business rules, and complete risk review.',
      initial: 'capturingOrder',
      states: {
        capturingOrder: {
          entry: 'recordOrderReceived',
          on: {
            ORDER_CAPTURED: 'normalizingPayload',
          },
        },
        normalizingPayload: {
          on: {
            PAYLOAD_NORMALIZED: 'validatingSchema',
            PAYLOAD_MALFORMED: '#enterpriseFulfillment.failed',
          },
        },
        validatingSchema: {
          on: {
            SCHEMA_VALID: 'enrichingCustomer',
            SCHEMA_INVALID: '#enterpriseFulfillment.failed',
          },
        },
        enrichingCustomer: {
          on: {
            CUSTOMER_ENRICHED: 'checkingFraudRisk',
            CUSTOMER_NOT_FOUND: 'manualCustomerReview',
          },
        },
        manualCustomerReview: {
          on: {
            CUSTOMER_APPROVED: 'checkingFraudRisk',
            CUSTOMER_REJECTED: '#enterpriseFulfillment.cancelled',
          },
        },
        checkingFraudRisk: {
          on: {
            RISK_ACCEPTABLE: 'accepted',
            RISK_REVIEW_REQUIRED: 'manualFraudReview',
          },
        },
        manualFraudReview: {
          on: {
            APPROVE_RISK: 'accepted',
            REJECT_RISK: '#enterpriseFulfillment.cancelled',
          },
        },
        accepted: {
          type: 'final',
          entry: 'publishOrderAccepted',
        },
      },
      onDone: 'planning',
    },
    planning: {
      description:
        'Reserve inventory, authorize payment, and prepare warehouse execution in parallel.',
      type: 'parallel',
      states: {
        inventory: {
          initial: 'checkingAvailability',
          states: {
            checkingAvailability: {
              on: {
                INVENTORY_AVAILABLE: 'holdingStock',
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
            holdingStock: {
              on: {
                STOCK_HELD: 'allocatingBins',
                HOLD_CONFLICT: 'reservationConflict',
              },
            },
            allocatingBins: {
              on: {
                BINS_ALLOCATED: 'checkingSplitShipment',
                BIN_ALLOCATION_FAILED: 'reservationConflict',
              },
            },
            checkingSplitShipment: {
              on: {
                SINGLE_SHIPMENT: 'reserved',
                SPLIT_SHIPMENT_REQUIRED: 'creatingSplitPlan',
              },
            },
            creatingSplitPlan: {
              on: {
                SPLIT_PLAN_CREATED: 'reserved',
                SPLIT_PLAN_FAILED: '#enterpriseFulfillment.failed',
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
                PAYMENT_AUTHORIZED: 'fraudLiabilityCheck',
                PAYMENT_ACTION_REQUIRED: 'requiresCustomerAction',
                PAYMENT_DECLINED: '#enterpriseFulfillment.cancelled',
              },
            },
            requiresCustomerAction: {
              on: {
                CUSTOMER_UPDATED_PAYMENT: 'authorizing',
                PAYMENT_WINDOW_EXPIRED: '#enterpriseFulfillment.cancelled',
              },
            },
            fraudLiabilityCheck: {
              on: {
                LIABILITY_ACCEPTED: 'authorized',
                LIABILITY_REVIEW_REQUIRED: 'manualPaymentReview',
              },
            },
            manualPaymentReview: {
              on: {
                PAYMENT_REVIEW_APPROVED: 'authorized',
                PAYMENT_REVIEW_REJECTED: '#enterpriseFulfillment.cancelled',
              },
            },
            authorized: {
              type: 'final',
            },
          },
        },
        warehousePrep: {
          initial: 'selectingWarehouse',
          states: {
            selectingWarehouse: {
              on: {
                WAREHOUSE_SELECTED: 'creatingWave',
                NO_WAREHOUSE_CAPACITY: '#enterpriseFulfillment.failed',
              },
            },
            creatingWave: {
              on: {
                WAVE_CREATED: 'ready',
                WAVE_CREATE_FAILED: '#enterpriseFulfillment.failed',
              },
            },
            ready: {
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
      description:
        'Release the wave, assign work, scan stock, confirm quantities, and close pick tasks.',
      initial: 'waveQueued',
      states: {
        waveQueued: {
          on: {
            WAVE_RELEASED: 'optimizingRoute',
          },
        },
        optimizingRoute: {
          on: {
            ROUTE_OPTIMIZED: 'assigningPicker',
            ROUTE_OPTIMIZATION_FAILED: 'supervisorReview',
          },
        },
        assigningPicker: {
          on: {
            PICKER_ASSIGNED: 'inProgress',
            PICKER_ASSIGNMENT_FAILED: 'supervisorReview',
          },
        },
        inProgress: {
          initial: 'navigatingToLocation',
          states: {
            navigatingToLocation: {
              on: {
                ARRIVED_AT_LOCATION: 'scanningLocation',
              },
            },
            scanningLocation: {
              on: {
                LOCATION_CONFIRMED: 'scanningSku',
                WRONG_LOCATION: 'exception',
              },
            },
            scanningSku: {
              on: {
                SKU_CONFIRMED: 'checkingQuantity',
                WRONG_SKU: 'exception',
                ITEM_DAMAGED: 'exception',
              },
            },
            checkingQuantity: {
              on: {
                QUANTITY_CONFIRMED: 'droppingToTote',
                QUANTITY_MISMATCH: 'exception',
              },
            },
            droppingToTote: {
              on: {
                TOTE_CONFIRMED: 'decidingNextPick',
                WRONG_TOTE: 'exception',
              },
            },
            decidingNextPick: {
              on: {
                MORE_ITEMS_REQUIRED: 'navigatingToLocation',
                ALL_ITEMS_PICKED: 'complete',
              },
            },
            exception: {
              entry: 'recordPickException',
              on: {
                SUBSTITUTE_APPROVED: 'navigatingToLocation',
                RECOUNT_APPROVED: 'checkingQuantity',
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
            REQUEUE_PICK: 'waveQueued',
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
      description:
        'Run scan, count, damage, and compliance checks before allowing packing.',
      initial: 'awaitingScan',
      states: {
        awaitingScan: {
          on: {
            QA_SCAN_STARTED: 'countingItems',
          },
        },
        countingItems: {
          on: {
            ITEM_COUNT_MATCHED: 'inspectingDamage',
            ITEM_COUNT_MISMATCHED: 'manualReview',
          },
        },
        inspectingDamage: {
          on: {
            NO_DAMAGE_FOUND: 'checkingCompliance',
            DAMAGE_FOUND: 'manualReview',
          },
        },
        checkingCompliance: {
          on: {
            COMPLIANCE_PASSED: 'passed',
            COMPLIANCE_HOLD_REQUIRED: 'complianceHold',
          },
        },
        complianceHold: {
          on: {
            COMPLIANCE_RELEASED: 'passed',
            COMPLIANCE_REJECTED: '#enterpriseFulfillment.failed',
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
      description:
        'Prepare parcel materials, pack items, and produce shipping documents in parallel.',
      type: 'parallel',
      states: {
        parcel: {
          initial: 'measuringItems',
          states: {
            measuringItems: {
              on: {
                MEASUREMENTS_CAPTURED: 'selectingCarton',
              },
            },
            selectingCarton: {
              on: {
                CARTON_SELECTED: 'addingDunnage',
                NO_CARTON_AVAILABLE: '#enterpriseFulfillment.failed',
              },
            },
            addingDunnage: {
              on: {
                DUNNAGE_ADDED: 'placingItems',
              },
            },
            placingItems: {
              on: {
                ITEMS_PLACED: 'weighingParcel',
              },
            },
            weighingParcel: {
              on: {
                PARCEL_WEIGHT_CAPTURED: 'sealingParcel',
                WEIGHT_OUT_OF_RANGE: '#enterpriseFulfillment.qualityGate',
              },
            },
            sealingParcel: {
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
                DOCUMENTS_GENERATED: 'validatingDocuments',
                DOCUMENTS_FAILED: '#enterpriseFulfillment.failed',
              },
            },
            validatingDocuments: {
              on: {
                DOCUMENTS_VALID: 'ready',
                DOCUMENTS_INVALID: 'generatingDocuments',
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
      description:
        'Shop rates, buy a label, manifest the parcel, hand it to the carrier, and track delivery.',
      initial: 'shoppingRates',
      states: {
        shoppingRates: {
          on: {
            RATES_RECEIVED: 'selectingCarrier',
            RATE_SHOP_FAILED: 'manualCarrierSelection',
          },
        },
        selectingCarrier: {
          on: {
            CARRIER_SELECTED: 'purchasingLabel',
            CARRIER_SELECTION_FAILED: 'manualCarrierSelection',
          },
        },
        manualCarrierSelection: {
          on: {
            CARRIER_SELECTED: 'purchasingLabel',
            CANCEL_SHIPMENT: '#enterpriseFulfillment.cancelled',
          },
        },
        purchasingLabel: {
          on: {
            LABEL_PURCHASED: 'printingLabel',
            LABEL_PURCHASE_FAILED: 'labelRetryDelay',
          },
        },
        labelRetryDelay: {
          entry: 'recordLabelRetry',
          after: {
            5000: 'purchasingLabel',
          },
        },
        printingLabel: {
          on: {
            LABEL_PRINTED: 'manifestingParcel',
            LABEL_PRINT_FAILED: 'manualCarrierSelection',
          },
        },
        manifestingParcel: {
          on: {
            PARCEL_MANIFESTED: 'awaitingPickup',
            MANIFEST_FAILED: '#enterpriseFulfillment.failed',
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
            OUT_FOR_DELIVERY: 'outForDelivery',
            DELIVERY_EXCEPTION: 'deliveryException',
          },
        },
        outForDelivery: {
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
      onDone: 'settlement',
    },
    settlement: {
      description:
        'Capture payment, close accounting, notify customer, and archive the workflow.',
      initial: 'capturingPayment',
      states: {
        capturingPayment: {
          on: {
            PAYMENT_CAPTURED: 'closingAccounting',
            PAYMENT_CAPTURE_FAILED: 'financeReview',
          },
        },
        financeReview: {
          on: {
            FINANCE_APPROVED: 'closingAccounting',
            FINANCE_REJECTED: '#enterpriseFulfillment.failed',
          },
        },
        closingAccounting: {
          on: {
            ACCOUNTING_CLOSED: 'notifyingCustomer',
          },
        },
        notifyingCustomer: {
          on: {
            CUSTOMER_NOTIFIED: 'archiving',
          },
        },
        archiving: {
          on: {
            WORKFLOW_ARCHIVED: 'complete',
          },
        },
        complete: {
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

