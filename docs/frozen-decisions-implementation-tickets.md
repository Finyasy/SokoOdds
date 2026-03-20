# Frozen Decisions Implementation Tickets

## Purpose

This document translates four launch-critical architectural decisions into concrete implementation tickets and starter code targets:

- idempotency
- worker ownership
- engine startup ordering
- WebSocket sequencing

These are not optional refinements. They are baseline reliability controls for a money-moving prediction market.

## D1. Idempotency

### Why It Matters

Deposits, withdrawals, and orders must not duplicate under retries, packet loss, double taps, or aggressive mobile retry behavior.

### Frozen Decision

- frontend generates one UUID per user action
- retries reuse the same `Idempotency-Key`
- idempotency is durable in PostgreSQL
- Redis may cache hot lookups but is not the durable truth
- a database-level unique constraint enforces `user_id + route + key`
- exact replay returns the original status code and response body
- same key with different payload returns `409 Conflict`
- records expire by retention window and are cleaned up on a schedule using `expires_at`

### Tickets

#### `D1-01` API Idempotency Store Interface

Targets:

- `apps/api/app/core/idempotency.py`

Acceptance criteria:

- store supports `get`, `save`, and `clear`
- request hashing is deterministic
- scope is `user_id + route + key`
- durable records store response status, response body, and `expires_at`

#### `D1-02` Order Intake Uses Idempotency

Targets:

- `apps/api/app/api/v1/routes/orders.py`

Acceptance criteria:

- `POST /api/v1/orders` requires `Idempotency-Key`
- same payload and key returns stored response
- response includes an idempotency status hint such as `created` or `replayed`
- different payload and same key returns `409`

#### `D1-03` Deposit and Withdrawal Integration

Targets:

- future wallet routes

Acceptance criteria:

- deposit and withdrawal initiation reuse the same idempotency behavior
- payment retries do not create duplicate side effects
- retention windows and cleanup behavior are documented consistently with API contracts

## D2. Worker Ownership

### Why It Matters

Settlement, reconciliation, payment follow-up, and notification logic should not live in request handlers.

### Frozen Decision

- `apps/worker` is a separate runtime service
- v1 uses the same codebase and Docker image as `apps/api`
- worker runs a different command and owns async/retryable background tasks

### Tickets

#### `D2-01` Worker Runtime Manifest

Targets:

- `apps/worker/app/runtime.py`
- `apps/worker/app/main.py`

Acceptance criteria:

- worker modes are explicit
- runtime responsibilities are visible in code
- unknown worker modes fail loudly

#### `D2-02` Background Job Ownership Stubs

Targets:

- `apps/worker/app/jobs/*`

Acceptance criteria:

- trade-result consumption stub exists
- settlement stub exists
- reconciliation stub exists
- payment follow-up stub exists
- notifications stub exists

## D3. Engine Startup Ordering

### Why It Matters

If the engine consumes live events before hydration and offset recovery, matching can start from an invalid in-memory state.

### Frozen Decision

1. migrations complete
2. API and worker dependencies are reachable
3. engine hydrates open books from PostgreSQL
4. engine restores last stream offset
5. engine begins consuming new events
6. engine marks itself ready
7. order placement is blocked or held until readiness is confirmed

### Tickets

#### `D3-01` Engine Health Contract

Targets:

- `apps/market-engine/src/main.rs`

Acceptance criteria:

- `/internal/health` reports `hydrating` or `ready`
- payload includes `books_loaded`
- payload includes `order_intake_enabled`

#### `D3-02` API Readiness Gate

Targets:

- `apps/api/app/core/engine.py`
- `apps/api/app/api/v1/routes/health.py`
- `apps/api/app/api/v1/routes/orders.py`

Acceptance criteria:

- API can query engine readiness
- order intake can be gated by engine readiness
- a health endpoint exposes the current gate state

## D4. WebSocket Sequencing

### Why It Matters

Without sequence handling, clients can apply stale book and price updates out of order and show users incorrect market state.

### Frozen Decision

- market events carry a monotonic per-market sequence
- engine owns the sequence for engine-originated market channels
- successful subscriptions receive a snapshot baseline before incremental updates
- clients drop stale messages
- sequence gaps trigger HTTP snapshot refetch

### Tickets

#### `D4-01` Event Contract Baseline

Targets:

- `docs/core-api-contracts.md`

Acceptance criteria:

- event envelope documents `sequence`
- event envelope documents `engine_emitted_at` for engine-originated market messages
- channel naming and snapshot-baseline behavior are explicit
- ownership and gap-handling rules are explicit

#### `D4-02` Frontend Sequence Hook

Targets:

- future websocket client module in `apps/web`

Acceptance criteria:

- client tracks `lastSeq` per channel
- stale messages are dropped
- client applies snapshot baselines before incremental updates
- gaps trigger snapshot refetch

## Starter Code Delivered In This Pass

This repo now includes first-pass starter code for:

- API idempotent order intake
- API engine-readiness gate
- worker runtime ownership and task stubs
- engine health state for `hydrating` versus `ready`

The next implementation pass should replace in-memory and stub behavior with:

- PostgreSQL-backed idempotency persistence
- real engine health polling over HTTP
- Redis Stream consumers
- actual settlement and reconciliation job logic
