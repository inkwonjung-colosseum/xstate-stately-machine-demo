import { createMachine } from 'xstate';

export const packingMachine = createMachine({
  id: 'packingMachine',
  description:
    'Parallel packing workflow for parcel preparation and document generation.',
  type: 'parallel',
  context: {
    parcelId: null,
    documentBatchId: null,
  },
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
            NO_CARTON_AVAILABLE: 'failed',
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
            WEIGHT_OUT_OF_RANGE: 'failed',
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
        failed: {
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
            DOCUMENTS_FAILED: 'failed',
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
        failed: {
          type: 'final',
        },
      },
    },
  },
});

