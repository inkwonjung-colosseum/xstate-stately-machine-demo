import { createMachine } from 'xstate';

export const planningMachine = createMachine({
  id: 'planningMachine',
  description:
    'Parallel planning workflow for inventory reservation, payment authorization, and warehouse preparation.',
  type: 'parallel',
  context: {
    orderId: null,
    waveId: null,
    warehouseId: null,
  },
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
            BACKORDER_TIMEOUT: 'failed',
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
            SPLIT_PLAN_FAILED: 'failed',
          },
        },
        reservationConflict: {
          on: {
            RECHECK_INVENTORY: 'checkingAvailability',
            CANCEL_ORDER: 'failed',
          },
        },
        reserved: {
          type: 'final',
        },
        failed: {
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
            PAYMENT_DECLINED: 'failed',
          },
        },
        requiresCustomerAction: {
          on: {
            CUSTOMER_UPDATED_PAYMENT: 'authorizing',
            PAYMENT_WINDOW_EXPIRED: 'failed',
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
            PAYMENT_REVIEW_REJECTED: 'failed',
          },
        },
        authorized: {
          type: 'final',
        },
        failed: {
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
            NO_WAREHOUSE_CAPACITY: 'failed',
          },
        },
        creatingWave: {
          on: {
            WAVE_CREATED: 'ready',
            WAVE_CREATE_FAILED: 'failed',
          },
        },
        ready: {
          type: 'final',
        },
        failed: {
          type: 'final',
        },
      },
    },
  },
});

