import { createMachine } from 'xstate';

export const shippingMachine = createMachine({
  id: 'shippingMachine',
  description:
    'Shipping workflow for rate shopping, label purchase, printing, manifesting, pickup, and delivery.',
  initial: 'shoppingRates',
  context: {
    carrier: null,
    trackingNumber: null,
    labelAttempts: 0,
  },
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
        CANCEL_SHIPMENT: 'cancelled',
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
        MANIFEST_FAILED: 'failed',
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
        PICKUP_RESCHEDULE_FAILED: 'failed',
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
        RETURN_TO_SENDER: 'failed',
      },
    },
    delivered: {
      type: 'final',
      entry: 'publishDeliveryConfirmed',
    },
    cancelled: {
      type: 'final',
      entry: 'publishShipmentCancelled',
    },
    failed: {
      type: 'final',
      entry: 'publishShippingFailed',
    },
  },
});

