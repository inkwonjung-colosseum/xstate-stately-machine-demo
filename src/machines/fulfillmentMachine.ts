import { createMachine } from 'xstate';

export const fulfillmentMachine = createMachine({
  id: 'fulfillmentOverview',
  description:
    'High-level fulfillment overview that links the domain-specific machines together.',
  initial: 'intake',
  context: {
    orderId: null,
    currentStage: 'intake',
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
      description: 'Run the intakeMachine for order capture and risk approval.',
      on: {
        INTAKE_ACCEPTED: 'planning',
        INTAKE_REJECTED: 'cancelled',
      },
    },
    planning: {
      description:
        'Run the planningMachine for inventory, payment, and warehouse preparation.',
      on: {
        PLANNING_READY: 'picking',
        PLANNING_FAILED: 'failed',
      },
    },
    picking: {
      description: 'Run the pickingMachine for warehouse pick execution.',
      on: {
        PICKING_COMPLETE: 'qualityGate',
        PICKING_ABORTED: 'failed',
      },
    },
    qualityGate: {
      description: 'Run the qualityGateMachine before packing can start.',
      on: {
        QUALITY_PASSED: 'packing',
        QUALITY_REWORK_REQUIRED: 'picking',
        QUALITY_REJECTED: 'failed',
      },
    },
    packing: {
      description: 'Run the packingMachine for parcel and document preparation.',
      on: {
        PACKING_COMPLETE: 'shipping',
        PACKING_FAILED: 'failed',
      },
    },
    shipping: {
      description: 'Run the shippingMachine for rate shop, label, pickup, and delivery.',
      on: {
        DELIVERY_CONFIRMED: 'settlement',
        SHIPPING_FAILED: 'failed',
      },
    },
    settlement: {
      description: 'Run the settlementMachine to close the workflow.',
      on: {
        SETTLEMENT_COMPLETE: 'completed',
        SETTLEMENT_FAILED: 'failed',
      },
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

