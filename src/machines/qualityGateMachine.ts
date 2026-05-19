import { createMachine } from 'xstate';

export const qualityGateMachine = createMachine({
  id: 'qualityGateMachine',
  description:
    'Quality gate workflow for item count, damage inspection, compliance hold, and rework decisions.',
  initial: 'awaitingScan',
  context: {
    qaOperatorId: null,
    holdReason: null,
  },
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
        COMPLIANCE_REJECTED: 'rejected',
      },
    },
    manualReview: {
      on: {
        QA_OVERRIDE_APPROVED: 'passed',
        QA_REWORK_REQUIRED: 'reworkRequired',
        QA_REJECTED: 'rejected',
      },
    },
    reworkRequired: {
      type: 'final',
      entry: 'publishReworkRequired',
    },
    passed: {
      type: 'final',
      entry: 'publishQualityPassed',
    },
    rejected: {
      type: 'final',
      entry: 'publishQualityRejected',
    },
  },
});

