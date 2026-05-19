import { createMachine } from 'xstate';

export const intakeMachine = createMachine({
  id: 'intakeMachine',
  description:
    'Order intake workflow for capture, normalization, validation, enrichment, and risk approval.',
  initial: 'capturingOrder',
  context: {
    orderId: null,
    customerId: null,
    riskScore: 0,
  },
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
        PAYLOAD_MALFORMED: 'rejected',
      },
    },
    validatingSchema: {
      on: {
        SCHEMA_VALID: 'enrichingCustomer',
        SCHEMA_INVALID: 'rejected',
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
        CUSTOMER_REJECTED: 'rejected',
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
});

