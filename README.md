# XState Stately Machine Demo

This public repository exists to test how Stately Studio imports and visualizes XState machines from GitHub.

The main example is a deliberately complex warehouse fulfillment workflow:

- order intake and fraud review
- parallel inventory reservation and payment authorization
- warehouse picking with nested scan states and exception handling
- quality review and rework
- parallel packing and document generation
- carrier label purchase, pickup, delivery, and failure recovery

## Machine File

Import this file into Stately Studio:

```text
src/machines/fulfillmentMachine.ts
```

GitHub URL:

```text
https://github.com/developjik1/xstate-stately-machine-demo/blob/main/src/machines/fulfillmentMachine.ts
```

Stately import URL pattern:

```text
https://github.stately.ai/developjik1/xstate-stately-machine-demo/blob/main/src/machines/fulfillmentMachine.ts
```

## Local Check

```bash
npm install
npm run check
```

## Notes

The machine intentionally uses a direct `createMachine({ ... })` call and string action, guard, actor, and delay names. That keeps the statechart readable for visual import while avoiding unrelated runtime implementation code.

