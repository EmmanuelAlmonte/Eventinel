# Review

## Findings
- Medium: Mapbox MarkerView is intended for limited counts (docs suggest ~100 max). We render one per incident and allow up to 250 incidents, which risks jank/slow map interactions. Prefer ShapeSource + SymbolLayer (or clustering) for higher volumes, or cap markers for the map view. components/map/IncidentMarker.tsx:58 screens/MapScreen.tsx:201 lib/map/constants.ts:25
- Medium: Cache workaround removes #g and since filters for cache queries, so cached incidents outside the current geohash/time window can appear until relays return. Consider client-side filtering when reading cache or re-evaluate if the upstream cache bug is fixed for your NDK version. hooks/useIncidentSubscription.ts:105
- Low: Feed uses FlatList; for potentially large lists, Expo best practices recommend FlashList with estimatedItemSize and memoized row components to reduce render cost. screens/IncidentFeedScreen.tsx:145
- Low: RefreshControl is present but does nothing. Either wire it to a reload (for example, retry subscription) or remove it to avoid a broken UX. screens/IncidentFeedScreen.tsx:151

## Open Questions / Assumptions
- Are you expecting more than 100 incident markers on map at once? If yes, we should move to ShapeSource/SymbolLayer + clustering.
- Is the cache workaround still necessary with your current @nostr-dev-kit/mobile version? If not, we can remove cacheUnconstrainFilter.

## Alignment Highlights
- NDK: Singleton + NDKCacheAdapterSqlite.initialize() + useNDKInit + useSessionMonitor matches NDK mobile guidance.
- Expo: Config uses app.config.js and supports .env.local/.env usage.
- RNEUI: ThemeProvider and themed components are used consistently.
