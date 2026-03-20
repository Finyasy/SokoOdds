# ADR-001 Idempotency

- Status: Accepted
- Owner: SokoOdds Platform Engineering
- Last updated: 2026-03-19

## Inputs

- money-sensitive requests will be retried on unstable mobile networks
- duplicate deposits, withdrawals, or orders would create real financial errors
- frontend and backend need one shared rule across all sensitive POST endpoints
- Redis is fast but should not be the only durable record for money-related controls

## Final Decision

SokoOdds requires a client-supplied `Idempotency-Key` header on all money-sensitive POST endpoints.

Applies to:

- `POST /api/v1/orders`
- `POST /api/v1/wallet/deposit`
- `POST /api/v1/wallet/withdraw`
- `POST /api/v1/admin/markets/{id}/resolve`

Key rules:

- frontend generates one UUID per user action
- retries for the same action must reuse the same key
- a new user action must generate a new key
- scope uniqueness by `user_id + route + key`
- enforce scope uniqueness with a database-level unique constraint
- store a deterministic request hash with the record
- store the original response status code and full response body with the record
- exact replay returns the original status code and response body
- same key with different payload returns `409 Conflict`

Storage rules:

- durable idempotency records live in PostgreSQL
- Redis may cache hot lookups, but it is not the durable source of truth

Retention rules:

- order keys retained for at least 24 hours
- payment keys retained for at least 72 hours
- each record stores an `expires_at` timestamp
- expired keys may be accepted again as new actions after retention windows pass

## Rejected Alternatives

### Redis-only idempotency storage

Rejected because Redis persistence and retention behavior are not strong enough to be the only durable source for money-moving guarantees.

### No payload hashing

Rejected because it allows the same key to be reused for a different request body, which creates ambiguous replay behavior.

### Server-generated idempotency keys

Rejected because the client must be able to retry the same user action after network loss without first receiving a successful response.

## Implementation Notes

- API responses should include an idempotency status hint such as `created` or `replayed`
- cleanup of expired records should run on a schedule using `expires_at`, not only opportunistically
- concurrent requests must rely on the unique constraint as the final idempotency guardrail
- replay behavior must be covered in service-level and API-level tests
- product copy should never expose technical wording to end users; the idempotency mechanism is internal
