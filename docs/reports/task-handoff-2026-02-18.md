# Eventinel Mobile Task Handoff (2026-02-18)

## 1) Executive Context

### Primary Program Goal (North Star)
- Execute the **Architecture Challenges (Non-Frozen Only)** goal in MCP with incremental, behavior-safe refactors and performance hardening.
- Improve maintainability (Programming Standard B), reduce fragility in subscription/navigation flows, and stabilize map/detail UX.

### Explicit Scope Constraints
- **Do not work relay/outbox challenges right now** (frozen by directive).
- Specifically frozen:
  - Relay lifecycle policy changes
  - Outbox/write policy changes
  - Relay-management task currently blocked in MCP

### Active Goal in MCP
- Goal ID: `40434787-54f0-4c94-a157-8480cef4dda2`
- Title: `Architecture Challenges (Non-Frozen Only)`
- Status: `active`
- Summary stats: `15 total`, `14 completed`, `1 blocked`

---

## 2) What Was Being Solved

### Initial Big Goal
- Start from an engineering-challenges assessment and execute only the approved, non-frozen challenges with strong guardrails:
  - split oversized modules
  - reduce complexity/hotspots
  - improve type safety
  - harden realtime paths
  - keep behavior stable

### Secondary Workstream That Emerged
- Incident detail mini-map transition artifact:
  - user-visible flash during `Map -> IncidentDetail`
  - identified as likely Mapbox first-frame fallback exposure on Android
- Added planning/findings docs and iterative mitigation attempts while preserving long-term direction (live interactive mini-map; not permanent snapshot fallback).

---

## 3) Current Branch + Workspace State

### Branch
- `refactor/full-production-standard-b` (HEAD at `5c7240f`)

### Current Worktree (not clean)
- Modified:
  - `screens/IncidentDetailScreen.tsx`
  - `screens/IncidentFeedScreen.tsx`
  - `screens/incidentDetail/IncidentDetailMiniMap.tsx`
  - `screens/map/useMapScreenState.ts`
  - `screens/map/useMapViewportSubscription.ts`
- Untracked:
  - `docs/reports/incident-detail-minimap-flash-findings.md`
  - `docs/reports/incident-detail-minimap-flash-plan.md`
  - `lib/debug/`

Note: Keep this dirty state in mind before starting the next task. Do not reset/revert unrelated changes.

---

## 4) Completed Work (MCP + Commits)

## Core challenge execution (non-frozen)
- `780dec75` Harden type safety and illegal-state guards
  - Commit: `e760f1f`
- `1ac60d32` Consolidate duplicated helpers/token sources
  - Commit: `f793d40`
- `121a82b2` Split oversized orchestrator modules
  - Commit: `d9d34fb`
  - Follow-up crash fix (`ThemeProvider` ordering): `020e248`
- `de0ec613` Realtime hot-path perf instrumentation/hardening
  - Commits: `edbbb22`, `fe65970`
- `ca06956a` Post-challenge Standard B rescan and follow-up plan
  - Completed in MCP (planning/backlog)

## Standard B follow-up tasks
- `8488d26e` Refactor incident batch reducer hot-path
  - Commit: `3dea304`
- `551d8e6e` Refactor oversized incident subscription controller
  - Commits: `36fd10c`, `bb8cd67`
- `b221c7cf` Reduce MapScreen function/composition complexity
  - Commit: `e24775a`
- `5c83ca14` Split oversized login/wallet hooks and sections
  - Commit: `bedae22`

## UX/perf tasks around map/detail behavior
- `cfd88bd6` Preserve incidents across transient subscription disables
  - Commit: `4a15ff6`
  - Purpose: avoid empty-marker window on return to map
- `ec0f19ce` Remove mini-map spinner placeholder
  - Commit: `09430f1`
- `b0c4070d` Hide mini-map until Mapbox ready
  - Commit: `5c7240f`
- `18e7d23b` Mini-map flash baseline plan/matrix
  - Completed (docs)
- `ef221e3c` Mini-map flash findings/iteration log
  - Completed (docs)

## Blocked task (intentionally)
- `6b50eba6` Split oversized relay-management hook
  - Status: `blocked`
  - Reason: touches frozen relay lifecycle area

---

## 5) Key Decisions and Why

### A) Relay/Outbox Freeze Is Real and Enforced
- Rationale: product direction requires no work in relay/outbox policy areas for now.
- Effect: tasks and fixes are constrained to non-frozen boundaries.

### B) Subscription State Preservation on Transient Disable
- Decision: do not clear incident state during transient focus-loss disable path.
- Why: avoid visible empty map for 2–3 seconds when returning from detail.
- Constraint: still stop subscriptions; only avoid aggressive state wipe.

### C) Mini-map Flash Treated as Native First-Frame Exposure
- Evidence: visual artifact (black circle/white halo) aligns with Mapbox fallback visuals.
- Mitigation direction:
  - preserve live mini-map architecture
  - test render gating/surface/projection choices first
  - avoid locking into static snapshot as long-term solution

### D) Navigation Instrumentation Added for Tap-to-Detail Timing
- Purpose: isolate where delay occurs (`press -> navigate -> mount -> first frame`).
- Outcome: instrumentation accuracy was fixed and now produces coherent source-linked traces.

---

## 6) What the Logs Are Showing (Most Recent Interpretation)

- Marker press and `navigate` calls are fast (single-digit milliseconds).
- Variable portion is typically `navigate.after -> detail.screen.mount` and `-> detail.first-frame`.
- Data availability on detail is generally fast once mounted.
- Heavy cache replay/subscription churn appears between transitions and can add JS-thread contention/jitter.
- The mini-map artifact is likely independent of pure JS navigation speed, and tied to map surface/style/first-render timing.

---

## 7) Mini-Map Investigation Artifacts

## Docs created
- `docs/reports/incident-detail-minimap-flash-plan.md`
- `docs/reports/incident-detail-minimap-flash-findings.md`

## What those docs include
- exact repro and affected files
- experiments already attempted and outcomes
- matrix for next experiments (E0/E1/E2/E3/E4)
- short-term mitigation vs long-term architecture
- explicit long-term target: interactive 3D mini-map centered on incident

---

## 8) Remaining Work and Recommended Next Order

### MCP task state
- Non-blocked backlog under this goal is effectively complete.
- One task remains blocked by policy (`6b50eba6` relay management).

### Practical next engineering steps (outside frozen scope)
1. Validate current uncommitted mini-map and nav-flow changes on-device.
2. Finalize which mini-map mitigation variant is best (from plan/findings docs).
3. Convert chosen variant into a single scoped MCP task with explicit acceptance criteria.
4. Keep relay/outbox untouched until freeze is lifted.

---

## 9) Risks / Caveats for Next Engineer or LLM

- Worktree is dirty; do not assume clean baseline.
- Several flows are UI/lifecycle sensitive and require device verification (map, detail transitions).
- Some tests are noisy (existing warnings), so distinguish warnings vs true failures.
- Wallet screen dedicated test path may not exist in this branch (`No tests found` previously documented).
- Mini-map fixes attempted so far did not fully eliminate user-reported artifact; continue with measured experiment protocol, not broad rewrites.

---

## 10) Validation Commands Used Throughout

- `npx tsc --noEmit`
- `npm test -- __tests__/hooks/useIncidentSubscription.test.ts`
- `npm test -- __tests__/screens/MapScreen.test.tsx`
- `npm test -- __tests__/screens/IncidentDetailScreen.test.tsx`
- `npm test -- __tests__/lib/notifications/incidentNotifications.test.ts`
- `npm test -- __tests__/screens/LoginScreen.test.tsx`
- `npm test` (full suite where needed)

---

## 11) Handoff Checklist (Actionable)

1. Confirm MCP current goal is still `40434787-54f0-4c94-a157-8480cef4dda2`.
2. Confirm blocked relay task remains blocked unless policy changes.
3. Inspect current dirty files and decide what to keep/discard per active mini-map experiment.
4. Run targeted validations before committing any new mini-map change:
   - `npx tsc --noEmit`
   - `npm test -- __tests__/screens/IncidentDetailScreen.test.tsx`
   - `npm test -- __tests__/screens/MapScreen.test.tsx`
5. Run manual device checks:
   - marker tap -> detail transition
   - back to map marker persistence
   - repeated tap/back cycles under same viewport
6. Log outcomes into findings doc; keep diffs reversible.

---

## 12) Reference Files

- `docs/reports/engineering-challenges-report.md`
- `docs/reports/incident-detail-minimap-flash-plan.md`
- `docs/reports/incident-detail-minimap-flash-findings.md`
- `hooks/incidentSubscription/useIncidentSubscriptionCore.ts`
- `hooks/incidentSubscription/eventReducer.ts`
- `hooks/incidentSubscription/useIncidentSubscriptionController.ts`
- `screens/MapScreen.tsx`
- `screens/map/useMapViewportSubscription.ts`
- `screens/IncidentDetailScreen.tsx`
- `screens/incidentDetail/IncidentDetailMiniMap.tsx`

---

## 13) One-Paragraph State Summary

The architecture-challenges program is largely complete for non-frozen scope (14/15 tasks complete), with major wins in module decomposition, type safety, subscription hot-path hardening, and map/detail UX stabilization. Relay/outbox work remains intentionally frozen and blocked. The current active engineering uncertainty is the IncidentDetail mini-map transition flash; planning and findings docs are in place, baseline mitigations were attempted, and the next phase should continue with controlled, measurable mini-map experiments while preserving the long-term live interactive 3D mini-map direction.
