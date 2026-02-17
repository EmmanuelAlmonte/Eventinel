# MCP Task Execution Prompts (First 3 Active Tasks)

Use these as copy/paste operator prompts for future LLM runs.

---

## Template 1 — Challenge 5

You are executing one task in `Eventinel-mobile` using AGENTS.md workflow.

Task to execute now:
- ID: `780dec75-ac28-45cd-9d5c-106f3d433a60`
- Title: `Harden type safety and illegal-state guards (Challenge 5)`

Required behavior:
1) Follow AGENTS.md sequential protocol and MCP status updates.
2) Implement only this task scope with minimal, reversible diffs.
3) Task-specific deliverables:
   - Remove high-risk runtime `any` usage in the scoped paths.
   - Replace `useNavigation<any>` in targeted screens with typed navigation.
   - Remove `comments as any` in incident detail flow and restore strict contract.
   - Add narrow types/guards for notification/map critical-path payloads.
4) In-scope paths:
   - `screens/IncidentDetailScreen.tsx`
   - `screens/incidentDetail/IncidentDetailScreenView.tsx`
   - `components/notifications/IncidentNotificationBridge.tsx`
   - `screens/map/config.ts`
   - `screens/*Screen.tsx` where `useNavigation<any>` appears
   - Related types near `lib/navigation.ts` as needed
5) Out of scope:
   - Relay lifecycle behavior/policy changes
   - Outbox/write reliability policy changes
6) Acceptance criteria:
   - No `comments as any` in incident detail flow.
   - Typed navigation used in touched screens.
   - Critical notification/map `any` replaced with narrow interfaces/guards.
   - No behavior regressions in incident detail open flow and notification-tap navigation.
7) Validation commands:
   - `npx tsc --noEmit`
   - `npm test -- __tests__/screens/IncidentDetailScreen.test.tsx`
   - `npm test -- __tests__/lib/notifications/incidentNotifications.test.ts`
8) Standard B rule:
   - While touching scoped files, fix related Standard B issues in those same files/functions.
   - Do not run a broad repo-wide Standard B cleanup in this task.
9) Commit with:
   - `<type>(task:780dec75): <summary>`
10) Update MCP:
   - Set `in_progress` when starting, `completed` when done, `blocked` with reason/evidence if blocked.
11) Final report must include:
   - files changed
   - commands run
   - test results
   - commit hash
   - follow-up risks

Start now by:
- checking `planning.current`
- reading `todo.get` for `780dec75-ac28-45cd-9d5c-106f3d433a60`
- if task status is not already in progress, set `todo.status(..., in_progress)`

---

## Template 2 — Challenge 6

You are executing one task in `Eventinel-mobile` using AGENTS.md workflow.

Task to execute now:
- ID: `1ac60d32-bccf-4ce3-bc20-32fdc8691b41`
- Title: `Consolidate duplicated helpers and token sources (Challenge 6)`

Required behavior:
1) Follow AGENTS.md sequential protocol and MCP status updates.
2) Implement only this task scope with minimal, reversible diffs.
3) Task-specific deliverables:
   - Consolidate duplicated relay helper logic to one canonical implementation.
   - Consolidate duplicate brand token source trees to one canonical source.
   - Update imports/call sites cleanly.
4) In-scope paths:
   - `screens/map/helpers.ts`
   - `screens/incidentFeed/helpers.ts`
   - `screens/relayConnect/helpers.ts` (shared formatting/helper overlap only)
   - `lib/brand/*` and `lib/brand/src/*`
5) Safety guardrail:
   - UI/helper dedup only. Do not modify relay lifecycle behavior or outbox/write policy.
6) Out of scope:
   - Relay connect/disconnect/reconnect semantics
   - NDK outbox/auto-connect policy
7) Acceptance criteria:
   - One canonical implementation for shared relay label/banner helper behavior.
   - One canonical brand token tree remains.
   - All imports updated; no dead exports or compile errors.
8) Validation commands:
   - `npx tsc --noEmit`
   - `npm test -- __tests__/screens/IncidentFeedScreen.test.tsx`
   - `npm test -- __tests__/screens/MapScreen.test.tsx`
9) Standard B rule:
   - While touching scoped files, fix related Standard B issues in those same files/functions.
   - Do not run a broad repo-wide Standard B cleanup in this task.
10) Commit with:
   - `<type>(task:1ac60d32): <summary>`
11) Update MCP:
   - Set `in_progress` when starting, `completed` when done, `blocked` with reason/evidence if blocked.
12) Final report must include:
   - files changed
   - commands run
   - test results
   - commit hash
   - follow-up risks

Start now by:
- checking `planning.current`
- reading `todo.get` for `1ac60d32-bccf-4ce3-bc20-32fdc8691b41`
- if task status is not already in progress, set `todo.status(..., in_progress)`

---

## Template 3 — Challenge 1

You are executing one task in `Eventinel-mobile` using AGENTS.md workflow.

Task to execute now:
- ID: `121a82b2-c0a2-4dae-b907-4d77a6da9813`
- Title: `Split oversized orchestrator modules into focused units (Challenge 1)`

Required behavior:
1) Follow AGENTS.md sequential protocol and MCP status updates.
2) Implement only this task scope with minimal, reversible diffs.
3) Task-specific deliverables:
   - Split oversized orchestrator files into focused planner/lifecycle/view/controller boundaries.
   - Preserve runtime behavior (structural refactor only).
   - Keep complexity and size moving toward Standard B limits in touched areas.
4) In-scope paths:
   - `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`
   - `App.tsx`
   - `screens/login/LoginSections.tsx`
   - `screens/wallet/WalletSections.tsx`
   - Any directly required extracted modules
5) Safety guardrail:
   - Do not modify relay lifecycle policy, relay connect/disconnect/reconnect behavior, or any outbox/write-queue behavior.
6) Out of scope:
   - Business behavior changes for subscription/auth/wallet features
   - Relay/outbox policy changes
7) Acceptance criteria:
   - Largest offender modules are split with clear responsibility boundaries.
   - No new file exceeds hard-stop size constraints.
   - User-visible behavior remains unchanged.
   - Touched areas remain test-covered/validated.
8) Validation commands:
   - `npx tsc --noEmit`
   - `npm test -- __tests__/hooks/useIncidentSubscription.test.ts`
   - `npm test -- __tests__/screens/LoginScreen.test.tsx`
   - `npm test -- __tests__/screens/WalletScreen.test.tsx`
9) Standard B rule:
   - While touching scoped files, fix related Standard B issues in those same files/functions.
   - Do not run a broad repo-wide Standard B cleanup in this task.
10) Commit with:
   - `<type>(task:121a82b2): <summary>`
11) Update MCP:
   - Set `in_progress` when starting, `completed` when done, `blocked` with reason/evidence if blocked.
12) Final report must include:
   - files changed
   - commands run
   - test results
   - commit hash
   - follow-up risks

Start now by:
- checking `planning.current`
- reading `todo.get` for `121a82b2-c0a2-4dae-b907-4d77a6da9813`
- if task status is not already in progress, set `todo.status(..., in_progress)`

