# IncidentDetail Mini-Map Flash Findings Log

## Scope
- Feature: Incident detail mini-map transition quality.
- Files in scope:
  - `screens/incidentDetail/IncidentDetailMiniMap.tsx`
  - `screens/incidentDetail/IncidentDetailScreenView.tsx` (context)
  - `screens/IncidentDetailScreen.tsx` (context)
- Guardrail respected: no relay/outbox changes.

## Baseline Findings

### F0: Previously attempted fixes did not resolve artifact (Observed)
- Prior change refs:
  - `09430f19952b17c026d5ce8b4e8f267121c0329e`
  - `5c7240f1f789d0ce5e63145d151d130fe8a7b802`
- Result: user still observed globe/halo flash during transition.
- Conclusion: spinner removal and generic visibility gating alone were insufficient.

### F1: Likely root mechanism (Inferred, high confidence)
- Evidence:
  - Frame captures show a globe-like circular render, not an app spinner.
  - Mapbox docs indicate `projection` can be `globe` and map rendering readiness is event-driven (`onDidFinishLoadingStyle`, `onDidFinishLoadingMap`, `onDidFinishRenderingMapFully`).
  - Android `surfaceView` defaults can affect visual composition behavior.
- Confidence statement: high confidence that the flash is first-frame native map fallback exposure before fully rendered map content.

## Iteration Log

### E1: Live map mitigation focused on first-frame exposure (Implemented)
- Files changed:
  - `screens/incidentDetail/IncidentDetailMiniMap.tsx`
- Changes:
  - Set `projection="mercator"`.
  - Set `surfaceView={false}` (TextureView path on Android).
  - Reveal map only on `onDidFinishRenderingMapFully`.
  - Add optional debug timing logs behind `EXPO_PUBLIC_DEBUG_MINIMAP_FLASH=1`.
- Why tested:
  - Preserve live map architecture while reducing chances that native fallback frame is shown during transition.
- Result:
  - Local static validation passed (type-safe).
  - Manual runtime verdict pending user mobile verification.
- Rollback safety:
  - Single-file revert possible.

## Current Decision
- Chosen next path: validate E1 on device first before adding heavier fallbacks.
- Rationale:
  - Minimal diff, preserves long-term interactive 3D direction.
  - Avoids early commitment to static snapshot behavior.

## If E1 Is Not Sufficient
- Next incremental options:
  1. E2: stronger background harmonization to eliminate bright contrast frame.
  2. E3: feature-flagged temporary snapshot fallback for unstable paths only.
  3. E4: dedicated long-term live 3D mini-map module (centered incident + controlled camera behavior).

## Long-Term Plan (Confirmed)
- Keep a live interactive mini-map as the product direction.
- Target behavior:
  - incident location centered
  - 3D camera pitch/bearing support
  - smooth transition with no placeholder flash
- Snapshot mode, if used, remains temporary and environment/flag controlled.
## Runtime Navigation Trace Logging

Enable with:
- `EXPO_PUBLIC_DEBUG_INCIDENT_NAV_FLOW=1`

What is logged:
- map marker path: shape-source press -> incident extraction -> navigate before/after
- feed path: feed item press -> navigate before/after
- detail path: screen mount -> first frame -> incident available -> after interactions

Timing format:
- each stage includes elapsed milliseconds since trace start (`elapsed=...ms`) and ISO timestamp (`t=...`).
- traces are keyed by `incidentId` (and `eventId` when present).
- traces auto-expire after 60s if not completed.
