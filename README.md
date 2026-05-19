# XState Stately Machine Demo

This public repository exists to test how Stately Studio imports and visualizes XState machines from GitHub.

The example is split into several importable XState machines instead of one large file:

- fulfillment overview
- order intake and fraud review
- parallel inventory reservation, payment authorization, and warehouse preparation
- warehouse picking with nested scan states and exception handling
- quality review and rework
- parallel packing and document generation
- carrier label purchase, pickup, delivery, and failure recovery
- settlement, accounting close, customer notification, and archival

## Machine Files

Each file can be imported into Stately Studio on its own.

| Machine | File | Stately import URL |
| --- | --- | --- |
| Fulfillment overview | `src/machines/fulfillmentMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/fulfillmentMachine.ts |
| Intake | `src/machines/intakeMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/intakeMachine.ts |
| Planning | `src/machines/planningMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/planningMachine.ts |
| Picking | `src/machines/pickingMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/pickingMachine.ts |
| Quality gate | `src/machines/qualityGateMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/qualityGateMachine.ts |
| Packing | `src/machines/packingMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/packingMachine.ts |
| Shipping | `src/machines/shippingMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/shippingMachine.ts |
| Settlement | `src/machines/settlementMachine.ts` | https://github.stately.ai/inkwonjung-colosseum/xstate-stately-machine-demo/blob/main/src/machines/settlementMachine.ts |

## Local Check

```bash
npm install
npm run check
```

## Notes

Each machine intentionally uses a direct `createMachine({ ... })` call and string action or delay names. That keeps the statecharts readable for visual import while avoiding unrelated runtime implementation code.
