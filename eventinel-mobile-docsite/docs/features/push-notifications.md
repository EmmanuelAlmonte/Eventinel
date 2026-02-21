---
title: Push Notifications
description: Permission, token registration, and incident notification behavior.
---

Push notification behavior is split across Profile actions and the app-level
notification bridge.

As of `2026-02-16`, this page reflects `screens/profile/usePushSettings.ts`,
`components/notifications/IncidentNotificationBridge.tsx`, and
`lib/notifications/pushRegistration.ts`.

## Profile-level controls

In Profile, users can:

- View current permission state (`granted`, `denied`, `undetermined`)
- Request notification permission
- Register Expo push token
- View and copy stored token

## Registration flow

Token registration (`registerForPushNotificationsAsync`) performs:

1. Android channel setup (`incidents`)
2. Physical device check
3. Permission check/request
4. Expo token request using EAS `projectId`

If any step fails, registration returns `null`.

## Token persistence

Token storage uses AsyncStorage key:

- `@eventinel/expoPushToken`

Helpers:

- `saveExpoPushToken`
- `loadExpoPushToken`
- `clearExpoPushToken`

## Incident notification bridge

`IncidentNotificationBridge` handles:

- Notification presentation policy (suppresses OS banner/list/sound/badge while
  app is running this handler)
- App startup token registration
- Last notification response replay
- Notification tap handling
- Incident payload coercion (`incidentId`, `eventId`)
- Incident fetch/cache navigation to `IncidentDetail`
- Duplicate tap protection via in-flight event/incident key tracking

It also raises in-app toast alerts for new incidents while app is active.

## Operational notes

- Push token generation is most reliable on physical devices.
- Missing EAS `projectId` prevents token issuance.
- If permission is denied, Profile should be used to request permission again
  before re-registering token.
