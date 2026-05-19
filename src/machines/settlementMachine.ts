import { createMachine } from 'xstate';

export const settlementMachine = createMachine({
  id: 'settlementMachine',
  description:
    'Settlement workflow for payment capture, accounting close, customer notification, and archival.',
  initial: 'capturingPayment',
  context: {
    orderId: null,
    invoiceId: null,
  },
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
        FINANCE_REJECTED: 'failed',
      },
    },
    closingAccounting: {
      on: {
        ACCOUNTING_CLOSED: 'notifyingCustomer',
        ACCOUNTING_FAILED: 'financeReview',
      },
    },
    notifyingCustomer: {
      on: {
        CUSTOMER_NOTIFIED: 'archiving',
        CUSTOMER_NOTIFICATION_FAILED: 'manualNotification',
      },
    },
    manualNotification: {
      on: {
        MANUAL_NOTIFICATION_SENT: 'archiving',
        MANUAL_NOTIFICATION_FAILED: 'failed',
      },
    },
    archiving: {
      on: {
        WORKFLOW_ARCHIVED: 'complete',
        ARCHIVE_FAILED: 'failed',
      },
    },
    complete: {
      type: 'final',
      entry: 'publishSettlementComplete',
    },
    failed: {
      type: 'final',
      entry: 'publishSettlementFailed',
    },
  },
});

