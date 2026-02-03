# Manual Test Guide: Startup/UI Gating, Cache-First, Location Denied

## Setup
- Ensure you have at least one relay configured in Relay Settings.
- Have a test account/session available for login.
- If possible, pre-load incidents in cache by running once with relays connected.

## Test 1: Startup Loading UI (No Blank Screen)
1. Force-close the app.
2. Relaunch the app.
3. Observe the first screen.

Expected:
- You see a lightweight startup loading UI (spinner + “Starting Eventinel” text).
- No blank/black screen while relays initialize.

## Test 2: Login vs Main UI
1. Log out (if logged in).
2. Relaunch the app.
3. Log in.

Expected:
- When logged out, you see the Login UI instead of a blank screen.
- After login, the main app loads without getting stuck.

## Test 3: Cache-First When Relays Disconnected
1. Ensure you previously loaded incidents while online (so cache exists).
2. Disable network or force all relays to disconnect (e.g., toggle airplane mode).
3. Open the Incident Feed screen.

Expected:
- The list loads cached incidents (if available) even though relays are disconnected.
- A relay status banner appears, but it does not block the list.
- If cache is empty, you see relay-related empty states (No Relays / Relays disconnected).

## Test 4: Relay Messaging Without Blocking Content
1. With relays disconnected, navigate between Map and Incident Feed.
2. If cache has incidents, verify they remain visible.

Expected:
- Relay status banner appears, but content is still visible.
- Banner includes action button to open Relay Settings.

## Test 5: Location Denied Handling
1. Revoke location permission for the app in device settings.
2. Relaunch the app and go to Map or Incident Feed.

Expected:
- You see a “Location Permission Needed” empty state with a Retry button.
- No infinite “Loading…” loop.
- Tapping Retry triggers the permission/location flow.

## Test 6: Location Unresolved (No Fix)
1. In simulator/emulator, deny or delay location so no fix is obtained.
2. Open Map or Incident Feed.

Expected:
- You see “Location Required” empty state with Retry.
- No infinite loading state.

## Test 7: Map Screen With Relays Disconnected
1. Disconnect relays and open Map.
2. If cache exists, verify incidents remain visible.

Expected:
- Map loads and renders cached incidents.
- A relay status banner appears at the top.
- Map is usable even with relays disconnected.

## What to Report if Failing
- Screen name and exact state (e.g., “Map: stuck on Loading…”).
- Whether location permission is granted or denied.
- Whether relays are configured and connected.
- Whether you had cached incidents before going offline.
