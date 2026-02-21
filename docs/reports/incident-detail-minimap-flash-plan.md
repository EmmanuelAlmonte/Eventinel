# IncidentDetail Mini-Map Flash Plan

## Issue Brief
- Symptom: During `Map -> IncidentDetail` navigation, the mini-map card briefly shows a globe-like fallback (`black circle with white halo on white background`) before the intended map content appears.
- Repro (user-observed):
  1. Open `Map` tab.
  2. Tap an incident marker.
  3. Observe transition into `IncidentDetail`.
  4. Mini-map flashes fallback frame before stable render.
- Expected: Mini-map should appear stable with no placeholder/globe flash.
- Actual: Native placeholder frame is visible during first-map-frame window.
- Device/build context: Android, reproduced after clean rebuild/reinstall.

## Affected Code Paths
- `screens/incidentDetail/IncidentDetailMiniMap.tsx`
- `screens/incidentDetail/IncidentDetailScreenView.tsx`
- `screens/IncidentDetailScreen.tsx`
- `AppNavigation.tsx` (screen transition context)

## Tried So Far (Observed)
- `09430f19952b17c026d5ce8b4e8f267121c0329e`
  - Removed spinner placeholder.
  - Result: no resolution of globe/halo flash.
- `5c7240f1f789d0ce5e63145d151d130fe8a7b802`
  - Hid mini-map until ready callbacks.
  - Result: no resolution in user verification.

## Working Hypothesis
The artifact is a native Mapbox first-frame fallback state shown before style/tiles/camera are fully rendered. On Android, composition behavior can still reveal this frame during transition if the map surface is visible earlier than expected.

## Documentation Basis
- `C:/Users/emman/Documents/EmmaWorkShop/DocsRepo/mapbox-react-native-docs/maps/docs/MapView.md`
  - `projection` (`mercator` | `globe`)
  - `surfaceView` (Android `GLSurfaceView` vs `TextureView`)
  - lifecycle callbacks (`onDidFinishLoadingStyle`, `onDidFinishLoadingMap`, `onDidFinishRenderingMapFully`)
- `C:/Users/emman/Documents/EmmaWorkShop/DocsRepo/mapbox-react-native-docs/maps/docs/snapshotManager.md`
  - temporary static snapshot option (not long-term target)

## Experiment Matrix (Ordered)

### E0: Baseline Confirmation
- Change: none (or selective revert baseline where needed).
- Goal: confirm current reproducibility before new mitigation.
- Pass: flash reproducible with current live mini-map.
- Fail: no flash; stop and reassess assumptions.
- Rollback: n/a.

### E1: Live Map Rendering Gate + Surface/Projection Alignment (minimum-risk first)
- Change:
  - Force `projection="mercator"`.
  - Force `surfaceView={false}` on Android.
  - Keep placeholder card visible; reveal live map only on `onDidFinishRenderingMapFully`.
  - Add optional dev timing logs via `EXPO_PUBLIC_DEBUG_MINIMAP_FLASH=1`.
- Why first: preserves live map architecture and future 3D path while directly targeting placeholder exposure window.
- Pass: globe/halo flash gone or materially reduced.
- Fail: no improvement; proceed to E2.
- Rollback: single-file revert (`screens/incidentDetail/IncidentDetailMiniMap.tsx`).

### E2: Container/Theme Harmonization
- Change: align card + placeholder + map background colors to avoid bright contrast during warm-up.
- Pass: no white flash even if short warm-up frame remains.
- Fail: visible artifact persists; proceed to E3.
- Rollback: style-only revert.

### E3: Temporary Snapshot Fallback (flagged)
- Change: feature-flagged fallback mode using `snapshotManager` for unstable devices/paths.
- Pass: no transition flash in fallback mode.
- Fail: fallback itself degrades UX or correctness; disable flag.
- Rollback: disable flag, keep live mode.

### E4: Long-Term Live 3D Mini-Map
- Change: dedicated live mini-map module with stable mount strategy and explicit 3D camera controls (center incident + pan/rotate behavior).
- Pass: interactive 3D UX, no transition flash, acceptable perf.
- Fail: regressions in startup/render time.
- Rollback: retain E1/E2 stable live baseline while iterating.

## Stop Conditions
- Stop iterative changes if:
  - two consecutive experiments provide no measurable visual improvement, or
  - changes require broad navigation rewrite, or
  - regression appears outside mini-map scope.
- At stop: freeze best-known variant and document next hypothesis.

## Short-Term vs Long-Term Direction
- Short-term: remove visual artifact without abandoning live map.
- Long-term: interactive 3D mini-map centered on incident, with controlled camera and smooth transitions.
- Explicitly out-of-scope here: relay lifecycle/outbox policy work.