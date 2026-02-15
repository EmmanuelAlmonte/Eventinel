# DVM Geo + Recent Incident Retrieval Plan

Last updated: 2026-02-15

## 1. Purpose

Build a standards-aligned way to retrieve incidents that are both geographically close and recent, without changing relay REQ filtering rules beyond NIP-compliant behavior.

## 2. Goal

For each user location (example: `40.0345567,-75.0433367`), return a stable ranked incident set that prioritizes proximity and recency, while keeping relay behavior NIP-compliant and predictable.

## 3. Why This Is Needed (Current Findings)

Recent probe results against `wss://relay.eventinel.com/` showed:

- Global filter `{kinds:[30911], limit:200}` is stable and returns data.
- For one run at `lat=40.0345567`, `lng=-75.0433367`:
  - `within10=160` out of 200.
  - `within1=6` out of 200.
  - `within100yd=0` out of 200.
- `#g` geohash-cell requests (for example `dr4eu` + neighbors) returned zero in our current event/tag setup.
- Relay rejects non-standard filter keys such as `lat` and `lng` in REQ.

Implication:

- Relay-side radius search from `event.content.lat/lng` is not available with standard filters.
- Client-only ranking helps, but nearby density remains capped by the initial window.
- A DVM can provide geo+time ranking without relaxing relay protocol constraints.

## 4. Standards and Constraints

- Keep relay filter parsing strict for standard Nostr flow.
- Do not introduce non-standard REQ filter fields (`lat`, `lng`, `#geohash` multi-char filter keys).
- Preserve compatibility with current app ingestion and rendering.
- Keep exact coordinates in event content for final precision calculations.

## 5. Proposed Architecture

1. Relay remains a standard event store and distributor.
2. DVM service is added as an independent compute layer.
3. DVM consumes incident events (`kind:30911`) from relay.
4. DVM maintains its own geo/time index for fast nearby+recent selection.
5. Client requests ranked nearby incidents from DVM and renders those results.
6. Client keeps fallback path to current direct relay subscription.

## 6. DVM Contract (Custom Kind Pair)

Define one custom request/result kind pair for geo incident search.

- Request kind: `5990` (proposed; final assignment pending team approval)
- Result kind: `6990` (proposed; final assignment pending team approval)

Request payload/tags should include:

- `lat`
- `lng`
- `radius_miles` (or meters)
- `since` (unix seconds)
- `until` (optional)
- `max_results`
- `sort_profile` (default: distance-then-recency)

Result should include:

- Correlation to request event ID.
- Requesting pubkey tag.
- Ranked incident references (event IDs and optional compact metadata).
- Deterministic order metadata to preserve stable UI ordering.

## 7. Data Model and Indexing in DVM

For each ingested incident event:

- `eventId`
- `incidentId` (from `d` tag if present)
- `created_at`
- `occurredAt` (parsed from content when present)
- `lat`, `lng` (parsed from content)
- source tags (`type`, `severity`, etc. when available)

Indexes:

- Geo index (geohash buckets or spatial index).
- Time index (`occurredAt`, fallback `created_at`).
- Dedup index on `incidentId`.

## 8. Ranking Strategy

Use deterministic ranking:

1. Distance bucket priority:
   - `<=100yd`
   - `<=0.25mi`
   - `<=1mi`
   - `<=5mi`
   - `>5mi`
2. Inside each bucket: `occurredAt desc`.
3. Tie-breaker: stable `incidentId` (or `eventId`).

This keeps UX stable while preferring very local incidents.

## 9. Client Integration Plan

1. Add DVM request function in data layer.
2. On map/feed focus:
   - Send DVM query with current location and time window.
3. Merge DVM results into existing incident context.
4. Keep relay direct subscription as fallback if DVM times out or errors.
5. Re-query DVM only on meaningful location movement or interval boundary.

## 10. Rollout Phases

### Phase 1: Specification

- Finalize custom kind numbers.
- Finalize request/response fields and validation rules.
- Draft and publish DVM metadata event (NIP-89 profile).

### Phase 2: DVM MVP

- Build relay ingest and parser for kind `30911`.
- Build geo/time index.
- Implement request handler for custom request kind.
- Emit custom result kind responses.

### Phase 3: Client Wiring

- Add DVM query path behind feature flag.
- Keep existing relay path as fallback.
- Add deterministic merge + display ordering in one place.

### Phase 4: Hardening

- Add rate limiting, request validation, auth policy.
- Add observability (latency, hit counts, radius bucket counts).
- Tune ranking thresholds with live data.

## 11. Testing Plan

Protocol and contract tests:

- Validate request and response shape for custom kinds.
- Verify correlation tags and deterministic output ordering.

Functional tests:

- Radius correctness at `100yd`, `1mi`, `5mi`, `10mi`.
- Recency ordering correctness inside each distance bucket.
- Dedup correctness by `incidentId`.

Integration tests:

- Relay ingest -> DVM index -> DVM response loop.
- Client fallback behavior when DVM is unavailable.

Repeatability tests:

- Same request 5x in short window.
- Compare count, ID overlap, top-N overlap, and nearest-distance drift.

## 12. Success Metrics

- `within1mi` count increases versus current baseline under same display cap.
- Median distance of shown incidents decreases.
- P95 DVM response time stays within target.
- Repeated identical requests show stable top results.
- Fallback path success rate remains high.

## 13. Risks and Mitigations

- Risk: stale index in DVM.
  - Mitigation: live subscriptions + periodic reconciliation.
- Risk: malformed content coordinates.
  - Mitigation: strict parser, drop invalid points, log parse errors.
- Risk: load spikes.
  - Mitigation: rate limits, short-lived cache by geocell/time window.
- Risk: schema drift in incident event shape.
  - Mitigation: versioned parser and compatibility tests.

## 14. Decisions Required

1. Final custom kind pair for geo incident query/result.
2. Public vs authenticated DVM usage policy.
3. Default query window (`since`) and radius per screen.
4. Exact response shape (`e` refs only vs enriched metadata).
5. SLO targets for response latency and fallback threshold.

## 15. Execution Tracking

Software planning goal:

- `Geo + Recent Incident Retrieval via DVM`
- Goal ID: `e59f7c5f-67b9-463f-938b-e9b259adf1a3`

Initial task created:

- `Implement DVM geo+recent query workflow from plan`
- Todo ID: `156f73ef-e43f-4817-9490-2334cef4705d`

