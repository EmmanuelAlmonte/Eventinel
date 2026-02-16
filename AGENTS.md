# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` boots the app, handles NDK init, and wires navigation; `index.ts` is the Expo entrypoint.
- UI lives in `screens/` (Home, Map, IncidentFeed, IncidentDetail, Profile, RelayConnect, Login, Menu) with shared primitives in `components/ui` (ScreenContainer, ErrorBoundary, Toast) plus `components/map`, `components/incident`, and `components/notifications` widgets.
- Domain/data: `lib/ndk.ts` defines the NDK singleton + SQLite cache; `lib/nostr/` holds Nostr config/events; `lib/relay/` tracks relay persistence/status; `lib/map/` stores map constants/types; `lib/notifications/` handles notification helpers; `lib/utils/` holds shared helpers (time formatting, etc.); `lib/theme` and `lib/brand` provide tokens; `hooks/` host subscriptions/theme/location hooks; `contexts/` expose incident cache and location providers.
- Assets live in `assets/`; Expo config in `app.config.js`; scripts/templates in `scripts/` and `templates/DeveloperProtocol.md`.
- Tests live in `__tests__` with supporting mocks in `__mocks__`; build outputs in `dist/` (exclude from commits).

## Build, Test, and Development Commands
- `npm install` – install dependencies.
- `npm start` – launch Expo Metro; `npm run android|ios|web` to run on targets.
- `npx tsc --noEmit` – TypeScript type-check.
- `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:auth` – Jest (jest-expo) suites; `test:auth` scopes to auth flows.

## Patch-package Notes
- Prefer generating patches via `npx patch-package <pkg>` rather than hand-editing.
- If a patch fails to parse, check hunk headers (`@@ -a,b +c,d @@`) match the exact number of context/deletion/insertion lines.
- Quick sanity check:
  - `node -e "const fs=require('fs');const {parsePatchFile}=require('patch-package/dist/patch/parse');parsePatchFile(fs.readFileSync('patches/<file>.patch','utf8'));console.log('ok')"`

## Coding Style & Naming Conventions
- TypeScript with strict mode; prefer functional components + hooks. Use 2-space indentation consistent with existing files.
- Respect path aliases (`@components`, `@hooks`, `@lib`, etc.) defined in `tsconfig.json`/`babel.config.js`.
- NDK rules: import only from `@nostr-dev-kit/mobile`; keep `react-native-get-random-values` as the first import; use the module-level `ndk` from `lib/ndk.ts`; timestamps in seconds and hex pubkeys; `login(signer, true)`; avoid web-only patterns (`NDKHeadless`, `NDKNip07Signer`, `localStorage`).
- UI: pull RNE components from `@rneui/themed`, theme via `useAppTheme`, wrap screens in `ScreenContainer` for layout/padding.
- Naming: components/screens in PascalCase `.tsx`; utilities/hooks in `camelCase.ts`; tests as `*.test.ts(x)` inside `__tests__`; mocks mirror module names in `__mocks__`.

## Testing Guidelines
- Framework: Jest with `jest-expo` + `@testing-library/react-native`; setup/mocks live in `jest.setup.js` and `__mocks__/`.
- Coverage targets: global 50% minimum; `screens/LoginScreen.tsx` enforces 70% (branches/functions/lines/statements).
- Prefer render + assert patterns from Testing Library; rely on existing mocks for RN/NDK heavy modules instead of ad-hoc stubs.
- Run `npm run test:auth` when touching auth code, and `npm run test:coverage` before PRs that modify screens/lib/App.
- Agent reporting rule: run `npx tsc --noEmit` as the default type check and report executed commands/results directly (for example, `npx tsc --noEmit: pass`), instead of generic "Verification" summaries.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`). Example: `feat: add relay reconnect banner`.
- PRs should include a brief summary, linked issue, commands/tests run, and screenshots or screen recordings for UI-visible changes. Call out adherence to NDK mobile rules and any env vars touched.
- Keep changes focused; update docs or templates (e.g., `templates/DeveloperProtocol.md`) when altering workflows.

## Project Memory Policy
- Keep project-specific durable knowledge in `.codex/MEMORY.md`.
- Keep daily project notes in `.codex/memory/YYYY-MM-DD.md`.
- Search `.codex/MEMORY.md` and `.codex/memory/*.md` before answering project-history questions.
- If asked to "remember this", write to disk immediately.
- Do not store secrets, tokens, API keys, or credentials in memory files.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local` for local development and to `.env` for production builds; keep secrets out of VCS. `app.config.js` loads `.env.local` in dev and `.env` in production and requires `MAPBOX_ACCESS_TOKEN` for Mapbox.
- Sensitive data persists via `expo-secure-store`; never use browser-only storage. Avoid committing build artifacts from `dist/`, `android/`, or `ios/`.
