# Eventinel Mobile

Eventinel Mobile is an Expo/React Native app that subscribes to Nostr `kind:30911` incident events and renders map/incident views for nearby reporting.

## Local Setup

```bash
cp .env.example .env.local
npm install
npm start
```

Default app entrypoints:
- `index.ts`
- `App.tsx`

## Development Commands

- `npx tsc --noEmit`
- `npm test`
- `npm run test:watch`
- `npm run test:coverage`
- `npm run test:auth`
- `npm run android | npm run ios | npm run web`

## Project Conventions

### Programming Standard B (size guardrails)

Use these thresholds unless explicitly exempted:

- **File length**
  - Soft cap: **300** lines
  - Hard cap: **400** lines
- **Function length**
  - Soft cap: **40** lines
  - Hard cap: **80** lines
- **Cyclomatic complexity**
  - Target: **≤10**
  - Hard cap: **15**

If a file/function exceeds a hard cap, split responsibilities before adding new behavior.

For relay + map subscription code, prefer extracting planner/reconcile/stateful boundaries to keep each module focused and easy to test.

## Architecture references

- Source map and current architecture notes live in `docs/`.
