# ADR-004 WebSocket Sequencing

- Status: Accepted
- Owner: SokoOdds Realtime Engineering
- Last updated: 2026-03-19

## Inputs

- market clients can receive websocket messages out of order on mobile networks
- stale updates can show users incorrect prices or order books
- realtime correctness matters even when the durable backend state is still right

## Final Decision

Engine-originated market events must include a monotonic per-market `sequence` value.

Rules:

- the Rust engine owns sequence generation for engine-originated market channels
- sequence increments once per emitted market event
- user-scoped channels maintain their own monotonic sequence stream
- successful market subscriptions should receive an initial snapshot with a trusted sequence baseline

Client behavior:

- track `lastSeq` per subscribed channel
- discard messages where `sequence <= lastSeq`
- apply messages normally only when they advance the channel state
- discard buffered messages where `sequence <= snapshot.sequence`
- if a gap is detected, trigger an HTTP snapshot refetch and reset the local baseline

Message rule:

- every outbound market message contains `sequence`

## Rejected Alternatives

### Apply websocket messages in arrival order with no sequencing

Rejected because arrival order on unreliable networks is not guaranteed and can display stale market state.

### Use timestamps alone instead of sequences

Rejected because timestamps are weaker than monotonic counters for exact ordering and gap detection.

### Put sequence ownership in the browser client

Rejected because ordering authority must come from the system emitting canonical market state.

## Implementation Notes

- sequence behavior must be documented in API contracts
- the websocket protocol should define explicit subscribe and unsubscribe messages
- the frontend websocket hook must own stale-drop and gap-refetch behavior
- initial snapshots should provide the first trusted sequence baseline
- engine-originated market events should include `engine_emitted_at` for end-to-end latency visibility
- sequence handling should be covered by realtime integration tests and frontend state tests
