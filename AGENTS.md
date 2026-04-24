# Eventinel App Repo Guidelines

This is the nested React Native/Expo app repo inside the outer Eventinel workspace. The outer workspace `AGENTS.md` is the primary behavior layer for task selection, MCP execution tracking, git safety, Android lifecycle evidence, secrets, and handoffs.

## Task And Execution State

- Use Software Planning MCP execution trackers as canonical live task state.
- Follow the outer workspace MCP flow before starting, validating, committing, or handing off work.
- Use local tracking files only when Software Planning MCP execution tools are unavailable, and record the MCP-unavailable note required by the outer workspace guide.
- Keep changes scoped to the selected todo. Do not bundle unrelated app work into docs/tooling commits or vice versa.
- Minimum validation for app code changes is `npx tsc --noEmit`, plus task-relevant Jest or Android evidence when behavior requires it.

## Architecture Standard

The app standard is feature-sliced UI, pure domain core, isolated native/Nostr adapters. See `../docs/PROGRAMMING_STANDARDS.md` for mandatory coding rules and `../docs/REFACTORING_PLAN.md` for oversized-file split targets.

Dependency direction:

```text
UI screens/components -> hooks/application services -> domain + adapters
```

- Screens and feature folders own UI flow only: compose state, render, handle user intent, and call hooks/application services.
- Product rules belong in `domain/`: incident taxonomy, severity, freshness, replacement policy, report eligibility, trust rules, notification eligibility, and performance budgets.
- External mechanics belong in `adapters/`: NDK, relay subscriptions, Mapbox, Expo notifications, SecureStore, SQLite/cache, native permissions, and wire formats.
- Hooks orchestrate effects. They should not become product-rule warehouses.
- Screens should not publish Nostr events, define severity policy, own map/relay lifecycles, or directly encode durable product decisions.

## Project Structure

- `App.tsx` boots the app and wires providers/navigation; `index.ts` is the Expo entrypoint.
- UI lives in `screens/`, screen feature subfolders, and shared component folders under `components/`.
- Current domain and adapter logic still lives mostly under `lib/`, `hooks/`, and `contexts/`; move it incrementally toward `domain/`, `adapters/`, `features/`, `state/`, `ui/`, and `testing/` as described in the standards docs.
- Tests live in `__tests__` with supporting mocks in `__mocks__`.
- Build outputs and generated artifacts such as `dist/`, `android/`, `ios/`, coverage, screenshots, and runtime evidence should not be committed unless a task explicitly requires a reviewed artifact.

## Coding Style

- TypeScript with strict mode; prefer functional components and hooks.
- Use 2-space indentation consistent with existing files.
- Respect path aliases defined in `tsconfig.json` and `babel.config.js`.
- NDK rules: import only from `@nostr-dev-kit/mobile`; keep `react-native-get-random-values` as the first import; use the module-level `ndk` from `lib/ndk.ts`; timestamps in seconds and hex pubkeys; `login(signer, true)`; avoid web-only patterns such as `NDKHeadless`, `NDKNip07Signer`, and `localStorage`.
- UI rules: pull RNE components from `@rneui/themed`, theme via `useAppTheme`, and keep reusable UI in shared components when it is used by more than one feature.
- Naming: components/screens in PascalCase `.tsx`; utilities/hooks in `camelCase.ts`; tests as `*.test.ts(x)` inside `__tests__`; mocks mirror module names in `__mocks__`.

## File Size Guardrails

Use `../docs/PROGRAMMING_STANDARDS.md` as the source of truth. Current practical guardrails:

- Screens: target 200 LOC, hard cap 325 LOC.
- Components/sections: target 120 LOC, hard cap 220 LOC.
- Hooks: target 150 LOC, hard cap 250 LOC.
- Context/providers: target 160 LOC, hard cap 275 LOC.
- Domain/services/adapters: target 180 LOC, hard cap 325 LOC.
- Tests: target 250 LOC, hard cap 400 LOC.
- Docs: target 120 lines, hard cap 200 lines.
- Functions: target 30 LOC, hard cap 60 LOC.

Files over 400 LOC are review-trigger territory. Files over 500 LOC need a named split target. Files over 700 LOC are urgent split candidates. Do not add new behavior to oversized files unless the same change extracts code or records an explicit exception/split plan.

## Testing Guidelines

- Framework: Jest with `jest-expo` and `@testing-library/react-native`; setup/mocks live in `jest.setup.js` and `__mocks__/`.
- Prefer behavior-first test files over giant implementation-file suites.
- Use shared builders for incidents, Nostr events, relay state, map viewport, report drafts, auth/session, and location state once a setup pattern repeats.
- Run `npm run test:auth` when touching auth code.
- Run task-relevant focused suites for changed hooks, screens, adapters, and domain logic.
- For cold-start, Mapbox, permissions, navigation, push notifications, or input responsiveness, TypeScript/Jest are not enough; capture Android runtime evidence using the outer workspace guide and tools.

## Build, Test, And Development Commands

- `npm install` - install dependencies.
- `npx tsc --noEmit` - TypeScript type-check.
- `npm test` - Jest suites.
- `npm run test:watch` - Jest watch mode.
- `npm run test:coverage` - Jest coverage.
- `npm run test:auth` - auth-focused tests.

For app launch, recovery, screenshots, UI hierarchy, logcat, Maestro, and Android lifecycle flows, follow the outer workspace `AGENTS.md` and `mobile-app-agent-usage-guides/` from the outer workspace. Prefer Eventinel MCP lifecycle tools before direct launch fallbacks.

## Patch-package Notes

- Prefer generating patches via `npx patch-package <pkg>` rather than hand-editing.
- If a patch fails to parse, check hunk headers match the exact number of context/deletion/insertion lines.
- Quick sanity check:
  - `node -e "const fs=require('fs');const {parsePatchFile}=require('patch-package/dist/patch/parse');parsePatchFile(fs.readFileSync('patches/<file>.patch','utf8'));console.log('ok')"`

## Commits And PRs

- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`.
- When a task ID exists, prefer `<type>(task:<first-8-task-id>): <summary>`.
- Keep commits scoped to one task only.
- PRs should include summary, linked issue/task, commands/tests run, and screenshots or screen recordings for UI-visible changes.

## Security

- Keep secrets out of tracked files, logs, screenshots, memory files, commits, and pushed artifacts.
- `app.config.js` loads `.env.local` in dev and `.env` in production and requires `MAPBOX_ACCESS_TOKEN` for Mapbox.
- Sensitive data persists via `expo-secure-store`; never use browser-only storage.
