import { createMachine } from 'xstate';

export const pickingMachine = createMachine({
  id: 'pickingMachine',
  description:
    'Warehouse picking workflow for route optimization, scan confirmation, tote drop, and exception handling.',
  initial: 'waveQueued',
  context: {
    waveId: null,
    pickerId: null,
    exceptionCount: 0,
  },
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
            ESCALATE_TO_SUPERVISOR: '#pickingMachine.supervisorReview',
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
        ABORT_PICK: 'failed',
      },
    },
    picked: {
      type: 'final',
    },
    failed: {
      type: 'final',
      entry: 'recordPickAbort',
    },
  },
});

