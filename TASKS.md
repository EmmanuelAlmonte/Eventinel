# Tasks

## Next Actions
1) Map markers performance
   - Move from MarkerView to ShapeSource/SymbolLayer (and/or clustering), or cap markers on the map.

2) Cache filtering
   - Add client-side filtering for cached incidents or re-test if cacheUnconstrainFilter is still needed for current NDK Mobile.

3) Feed performance
   - Replace FlatList with FlashList and provide estimatedItemSize, memoized rows.

4) Refresh control
   - Wire RefreshControl to a reload/retry or remove it.

5) Incident detail cache miss (P0)
   - Detail screen only reads from the in-memory cache populated by the sliced feed; deep links/cold starts can show "Incident not available."
   - Add read-through fallback (NDK cache/relay fetch by incidentId) or broaden cache population.
   - refs: screens/IncidentDetailScreen.tsx:75, contexts/IncidentSubscriptionContext.tsx:63, hooks/useIncidentSubscription.ts:192

6) NDK cache adapter bug (P1)
   - cacheUnconstrainFilter removes geohash/time filters, so cached incidents can be off-area/old.
   - Fix at source (upgrade/patch NDK cache adapter) or add client-side filtering before display/cache.
   - refs: lib/ndk.ts:60, hooks/useIncidentSubscription.ts:105

7) Location-gated subscription (P2)
   - Subscription is disabled until GPS resolves and fallback is "none"; denied/slow permissions can yield a permanently empty feed.
   - Decide on last-known/default region or manual location to avoid a dead app.
   - refs: contexts/LocationContext.tsx:32, contexts/IncidentSubscriptionContext.tsx:58
