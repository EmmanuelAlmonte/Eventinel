# Manual Test Guide: Map Marker Scalability (ShapeSource + Clustering)

## Setup
1. Use a real device or emulator with location enabled.
2. Ensure at least one relay is connected and incidents are available.
3. If possible, create or simulate 30-100+ incidents in a small area to trigger clusters.

## Test Cases
1. Map loads and renders.
Expected: Map shows, user location marker appears (blue dot), no JS errors.

2. Incident markers render as circles with severity labels.
Expected: Individual points show colored circles (severity color) with the severity number centered.

3. Clusters appear when zoomed out.
Expected: Multiple incidents collapse into a single cluster circle with a count label.

4. Cluster press zooms into the cluster.
Steps: Tap a cluster circle.
Expected: Camera zooms in to that cluster area; cluster should expand into smaller clusters or individual points.

5. Point press navigates to IncidentDetail.
Steps: Tap a single incident circle (not a cluster).
Expected: Navigates to IncidentDetail for that incident (uses incidentId only, no serialization warnings).

6. Fly-to-user button unchanged.
Steps: Tap the "Fly to my location" button.
Expected: Camera animates to user location; behavior unchanged.

7. Camera auto-resume behavior unchanged.
Steps: Drag the map; wait ~20 seconds.
Expected: Camera resumes following user location if it was previously following.

8. Empty state still works.
Steps: Use a relay or environment with zero incidents after EOSE.
Expected: "No incidents found" message appears with timeframe hint.

## What to Look For
- Smooth pan/zoom with many incidents (no lag spikes from marker views).
- Cluster counts are readable and update as you zoom.
- Tapping clusters consistently zooms in, not navigating to IncidentDetail.
- Tapping single points always navigates to the correct incident.
- User location marker and existing camera behavior unchanged.

## Notes
- In DEV mode, the stats overlay should still show the incident count and EOSE status.
- If clusters do not show up, you likely do not have enough incidents in close proximity or you are already zoomed in too far.
