# ADR-003 Engine Startup Ordering

- Status: Accepted
- Owner: SokoOdds Engine and Platform Engineering
- Last updated: 2026-03-19

## Inputs

- the Rust engine will keep hot order-book state in memory
- consuming live events before hydration and offset recovery can corrupt matching behavior
- API order intake must not assume the engine is ready when it is still hydrating

## Final Decision

The engine startup sequence is fixed:

1. database migrations complete
2. API and worker dependencies are reachable
3. engine loads open markets from PostgreSQL
4. engine loads open and partial orders from PostgreSQL
5. engine hydrates in-memory order books
6. engine restores last processed stream offset from PostgreSQL `engine_state`
7. engine begins consuming new events
8. engine health transitions from `hydrating` to `ready`

Health rules:

- `/internal/health` must expose `status`
- `/internal/health` must expose `books_loaded`
- `/internal/health` must expose `order_intake_enabled`
- readiness is false until hydration and offset recovery are complete

API rule:

- if the engine is the active matching authority, FastAPI must reject or hold order intake until the engine reports `ready`

Offset rule:

- last processed engine offset is stored durably in PostgreSQL
- Redis is not the system of record for engine offset recovery

## Rejected Alternatives

### Start consuming immediately, then hydrate opportunistically

Rejected because live event consumption against incomplete in-memory state can create silent matching errors.

### Store the engine offset only in Redis

Rejected because a Redis flush or persistence failure would destroy recovery state for the engine.

### Let the API accept orders regardless of engine readiness

Rejected because it creates a gap where orders can be accepted while no ready matching authority exists.

## Implementation Notes

- engine health should distinguish `hydrating`, `ready`, and `unreachable`
- API health should expose whether order intake is enabled
- deployment health checks should use readiness, not only process liveness
- restart scenarios must be covered in engine and service-level tests
