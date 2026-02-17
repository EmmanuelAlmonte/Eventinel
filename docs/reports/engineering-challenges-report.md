# Eventinel Mobile Engineering Challenges (Updated)

## Temporary Freeze (Do Not Work)
- Effective now, do **not** work on relay- or outbox-related challenges until further notice.
- Frozen scope includes:
  - Challenge 3 (Relay lifecycle ownership/distributed reconnect policy)
  - Challenge 4 (Offline write reliability / outbox policy)
  - Any relay/outbox portions of Challenge 2 (boundary refactors involving relay/outbox behavior)
- These items are deferred intentionally and are not active implementation targets.

## Environment Policy Note
- Strict relay policy is enforced in non-production (development/test/staging intent): explicit relays only, `enableOutboxModel=false`, `autoConnectUserRelays=false`.
- Production policy is configurable and may diverge at release time.
- All relay/outbox behavior should be controlled from one policy surface, not scattered feature code.

## Challenge 1: Oversized Orchestrators and Multi-Responsibility Modules
- Area/Layer: State, Data, Cross-cutting
- Evidence:
  - `hooks/incidentSubscription/useIncidentSubscriptionCore.ts` (~513 LOC)
  - `screens/login/LoginSections.tsx` (~423 LOC)
  - `App.tsx` (~363 LOC)
- Symptoms:
  - Hard-stop size breaches, high coupling, slow/fragile changes.
- Principle Violations:
  - Single Responsibility
  - Separation of Concerns
  - Locality of Behavior
  - Consistent Naming and Structure
- Suggested Fix:
  1. Extract startup orchestration from `App.tsx` into `app/startup/*`.
  2. Split incident subscription orchestration into planner/lifecycle/reducer modules.
  3. Enforce size/complexity limits in lint and CI.
- Validation:
  - No runtime file above 400 LOC.
  - Reduced change surface for map/feed subscription changes.

## Challenge 2: Boundary Leakage (UI/Feature Hooks Directly Touch Platform Adapters)
- Area/Layer: Boundaries, Data, Platform
- Evidence:
  - Direct `@lib/ndk` usage in screen hooks/controllers (`screens/relayConnect/useRelayManagement.ts`, `screens/wallet/useNwcWallet.ts`, `screens/login/useLoginMethods.ts`, `hooks/incidentComments/useCommentActions.ts`).
- Symptoms:
  - Data/platform concerns mixed into UI orchestration.
  - Harder testing and inconsistent side-effect policy.
- Principle Violations:
  - Dependency Direction
  - Boundaries and Layering
  - Encapsulation & Information Hiding
- Suggested Fix:
  1. Introduce gateways/adapters (`RelayGateway`, `AuthGateway`, `WalletGateway`, `IncidentWriteGateway`).
  2. Restrict direct `ndk` access to adapter layer.
  3. Keep UI hooks/controller logic platform-agnostic.
- Validation:
  - No direct `@lib/ndk` imports in `screens/*` (except explicit adapter hooks).
  - Unit tests mock gateway interfaces, not NDK internals.

## Challenge 3: Relay Lifecycle Ownership Is Distributed
- Area/Layer: Realtime, Platform, Cross-cutting
- Evidence:
  - Relay connect/reconnect logic split across `App.tsx`, `lib/ndk.ts`, `contexts/RelayStatusContext.tsx`, and `screens/relayConnect/useRelayManagement.ts`.
- Symptoms:
  - Potential duplicate reconnect triggers.
  - Repeated listener wiring and inconsistent retry semantics.
- Principle Violations:
  - Explicit Data Flow
  - Predictable Side Effects
  - Separation of Concerns
- Suggested Fix:
  1. Introduce one `RelayLifecycleService` as canonical owner.
  2. Move connect/disconnect/reconnect policy behind that service.
  3. Drive behavior from environment policy module.
- Validation:
  - Non-prod verifies strict policy (`enableOutboxModel=false`, `autoConnectUserRelays=false`).
  - Production policy (even if different) is applied by the same policy module/service.

## Challenge 4: Offline Write Reliability Policy Is Undefined (Environment-Scoped)
- Area/Layer: Data, Domain, Offline-first
- Evidence:
  - Read model exists (NDK SQLite cache, incident cache), but write flows publish directly (`hooks/incidentComments/useCommentActions.ts`, `screens/menu/useQuickCompose.ts`) without durable write-intent queue.
- Symptoms:
  - Flaky-network writes can fail without durable retry semantics.
  - Reliability differs by implicit behavior, not explicit policy.
- Principle Violations:
  - Explicit Data Flow
  - Make Illegal States Unrepresentable
  - Predictable Side Effects
- Suggested Fix:
  1. Add `WritePolicy` + write-intent queue/outbox behind gateway boundary.
  2. Non-prod: do not rely on NDK outbox; app-level queue handles durability if required.
  3. Production: choose app-level outbox vs NDK outbox policy via same module.
- Validation:
  - Offline write scenarios are deterministic and environment-policy driven.
  - Queued writes drain correctly on reconnect where policy requires it.

## Challenge 5: Illegal States Are Representable via `any` and Untyped Navigation Paths
- Area/Layer: Type Safety, API Boundaries
- Evidence:
  - `useNavigation<any>` in multiple screens, `comments as any` in `screens/IncidentDetailScreen.tsx`, `any` in notification/map types.
- Symptoms:
  - Lower compile-time guarantees, higher runtime edge-case risk.
- Principle Violations:
  - Make Illegal States Unrepresentable
  - Encapsulation & Information Hiding
  - Consistent Naming and Structure
- Suggested Fix:
  1. Fully type navigation with `RootStackParamList`.
  2. Replace `any` payloads with narrow interfaces/guards.
  3. Tighten lint (`no-explicit-any`) in runtime folders.
- Validation:
  - Significant drop in runtime `any` usages.
  - Type errors catch invalid route/payload states.

## Challenge 6: Duplication and Drift in Shared Helpers and Tokens
- Area/Layer: Shared, UI, Cross-cutting
- Evidence:
  - Duplicated relay status/format logic in map/feed/detail helpers.
  - Duplicated brand token trees in `lib/brand/*` and `lib/brand/src/*`.
- Symptoms:
  - Inconsistent behavior, duplicated fixes, unclear source of truth.
- Principle Violations:
  - DRY vs WET Until It Hurts
  - Locality of Behavior
  - Consistent Naming and Structure
- Suggested Fix:
  1. Consolidate relay helper utilities under one shared module.
  2. Keep one canonical brand token tree.
  3. Add ownership notes and duplication checks.
- Validation:
  - Single source for relay/banner formatting and brand tokens.

## Challenge 7: Realtime Hot Paths Need Performance Hardening
- Area/Layer: Performance, Realtime, Data
- Evidence:
  - Notification incident lookup may trigger broad sync cache scans (`lib/notifications/incidentNotifications.ts`).
  - Event reduction can clone map state repeatedly under burst load (`hooks/incidentSubscription/eventReducer.ts`).
- Symptoms:
  - Potential frame drops / latency spikes under event bursts.
- Principle Violations:
  - Locality of Behavior
  - Predictable Side Effects
- Suggested Fix:
  1. Add indexed lookup path for `incidentId` reads.
  2. Optimize reducer mutation/clone strategy.
  3. Add instrumentation for batch duration and tap-to-detail latency.
- Validation:
  - Lower p95 notification-open latency.
  - Lower p95 subscription batch processing time.
