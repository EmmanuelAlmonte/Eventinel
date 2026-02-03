# Offscreen Work Gating Manual Test Guide

## Setup
1. Use a build where location permission is granted and at least one relay is connected.
2. Ensure Map and Incidents tabs are available.
3. Optional: Have a way to generate new incidents (second device, known test relay, or existing active incident source).
4. Optional: Run in dev mode to observe console logs for subscription activity.

## Test 1: Subscription Only When Map/Feed Focused
Steps:
1. Open the Map tab and wait for incidents to load.
2. Switch to the Incidents tab and wait for the list to populate.
3. Switch to the Profile tab and wait 20–30 seconds.
4. Return to Map or Incidents.

Expected:
1. While on Map or Incidents, incidents load normally.
2. While on Profile, no new incidents should load in the background.
3. When you return to Map or Incidents, the list/markers should refresh again.

Look for:
1. Incident counts should not change while you are on Profile.
2. Incidents should resume updating once Map or Incidents is focused again.

## Test 2: Map Markers Don’t Update Offscreen
Steps:
1. Open Map and confirm markers are visible.
2. Switch to Incidents, then Profile.
3. If possible, generate a new incident while on Profile.
4. Return to Map.

Expected:
1. Map markers should not update while Map is offscreen.
2. When you return to Map, markers should reflect the latest incidents.

Look for:
1. No marker churn or visible updates while Map is not focused.
2. Markers appear updated only after returning to Map.

## Test 3: Feed List Doesn’t Update Offscreen
Steps:
1. Open Incidents and note the count (e.g., “3 nearby”).
2. Switch to Map, then Profile.
3. If possible, generate a new incident while on Profile.
4. Return to Incidents.

Expected:
1. The incident count should not change while Incidents is offscreen.
2. The count and list should update when you return to Incidents.

Look for:
1. The list should not update offscreen.
2. The list should catch up when focused again.

## Test 4: App Backgrounding Pauses Subscription
Steps:
1. Open Map or Incidents and confirm data is loaded.
2. Send the app to background for 20–30 seconds.
3. Bring the app back to foreground.

Expected:
1. Subscription activity should pause while backgrounded.
2. Incidents should refresh when app returns to foreground and Map/Incidents is focused.

Look for:
1. No new incident updates while app is in background.
2. Updates resume on foreground when a target tab is focused.

## Notes
1. If in-app incident toasts are expected on Profile, confirm whether they still appear. With the new gating, they should not appear unless Map or Incidents is focused. If that’s undesired, adjust the behavior accordingly.
