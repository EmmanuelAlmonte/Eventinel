# Map Performance Review

Date: 2026-02-02
Scope: Map screen + Mapbox marker rendering and incident data flow.

Reviewed files:
- screens/MapScreen.tsx
- components/map/IncidentMarker.tsx
- hooks/useIncidentSubscription.ts
- contexts/IncidentSubscriptionContext.tsx
- lib/map/constants.ts

## Findings (Prioritized)

### P0
- MarkerView-per-incident with no clustering (potential jank at current limits)
  - Files: screens/MapScreen.tsx, components/map/IncidentMarker.tsx, lib/map/constants.ts
  - Rationale: Map renders one React/JS MarkerView per incident with MAX_CACHE = 250. Mapbox MarkerView is heavy and intended for low counts; at higher counts it can drop frames and delay gestures.
  - Quick fix: Cap map markers (e.g., slice to 50–100 based on zoom) and/or hide the severity label when zoomed out to reduce view complexity.
  - Longer-term refactor: Replace MarkerView list with ShapeSource + SymbolLayer (and cluster=true) so clustering and rendering happen on the native map engine.

### P1
- Incident list updates trigger full marker rerenders
  - Files: screens/MapScreen.tsx, components/map/IncidentMarker.tsx, hooks/useIncidentSubscription.ts
  - Rationale: useIncidentSubscription rebuilds a new array on every update; MapScreen maps directly to <IncidentMarker/> elements without memoization. Even small event deltas rerender all markers, increasing JS/bridge churn.
  - Quick fix: Memoize IncidentMarker (React.memo) and stabilize the onPress callback (useCallback + pass incidentId) to reduce rerenders for unchanged markers.
  - Longer-term refactor: Normalize incidents in a store keyed by incidentId and only emit changed items; or move to ShapeSource where data updates are diffed on the native side.

- Cache workaround can inflate markers outside current geohash/time window
  - Files: hooks/useIncidentSubscription.ts
  - Rationale: cacheUnconstrainFilter removes #g/since/limit for cache queries, so cached incidents outside the active geohash/time window can render on the map until relay results arrive, increasing marker count and visual noise.
  - Quick fix: Client-side filter cached results by geohash neighborhood + occurredAt/createdAt before exposing to the map.
  - Longer-term refactor: Revisit NDK cache behavior and remove the workaround once the upstream cache bug is fixed for your @nostr-dev-kit/mobile version.

### P2
- High-frequency camera change handler work on JS thread
  - Files: screens/MapScreen.tsx
  - Rationale: onCameraChanged fires frequently while panning; it clears/resets timers and toggles followUser state on the JS thread, which can contend with marker rendering.
  - Quick fix: Gate followUser toggling to a single transition (e.g., use a ref to ignore subsequent calls while gesture is active) and throttle auto-resume scheduling.
  - Longer-term refactor: Use Mapbox tracking modes (followUserLocation / onUserTrackingModeChange) or region-change callbacks that fire on gesture end to reduce per-frame work.

- Custom user marker is a React view
  - Files: screens/MapScreen.tsx
  - Rationale: PointAnnotation with a View for the user location adds another React-managed view into the map. Not critical, but it adds overhead and bypasses native puck optimizations.
  - Quick fix: Replace with Mapbox.UserLocation or LocationPuck for native rendering.
  - Longer-term refactor: Use a custom puck image via Mapbox.Images and SymbolLayer for consistent styling across zoom levels.

## Risks / Testing Notes
- Switching to ShapeSource + SymbolLayer + clustering will change marker interaction behavior (cluster taps, zooming into clusters). Verify tap-to-open IncidentDetail still works and add a cluster-press behavior spec.
- Capping or filtering markers can hide incidents; validate UX expectations for “nearby vs all” and consider a UI toggle.
- After any data-flow changes, stress-test with 200+ incidents on a low-end Android device and profile frame times (Mapbox + React DevTools).
- Validate cache filtering logic against real relay data to avoid dropping legitimate incidents at the edge of the geohash window.
