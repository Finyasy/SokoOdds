# SokoOdds Implementation Concept Paper

## Purpose

This document explains how SokoOdds should be implemented in controlled sprints, with security and financial integrity treated as first-class requirements from the first line of code.

SokoOdds is not a normal content product. It handles:

- user identity
- wallet balances
- reserved funds
- order placement
- trade execution
- market resolution
- payouts
- payment callbacks

Because money is involved, the implementation plan must optimize for correctness, traceability, abuse resistance, and safe rollout, not just feature speed.

## Executive Summary

The implementation approach is:

1. build the platform in phased delivery sprints
2. keep PostgreSQL as the only financial source of truth
3. separate business control from execution speed
4. ship read-only and non-money features before live trading
5. require security gates before each money-moving milestone
6. verify every sensitive flow with automated, manual, and adversarial tests

Core architecture:

- `apps/web`: Next.js + TypeScript + Tailwind + shadcn/ui + pnpm
- `apps/api`: FastAPI + Python + uv + Ruff + Pyright + pytest
- `apps/market-engine`: Rust + Tokio + Axum + SQLx
- `apps/worker`: Python workers for settlement, notifications, reconciliation
- PostgreSQL: durable truth for users, orders, trades, wallets, ledger, payouts
- Redis: streams, pub/sub, rate limiting, hot cache
- WebSockets: live distribution layer
- Docker: reproducible local and deployment environments

## Tooling Baseline

SokoOdds should favor fast tooling across the stack:

- `pnpm` for frontend package management, workspaces, installs, and script execution
- `uv` for Python installs, lockfiles, and command execution
- `Ruff` for Python linting and formatting
- `Pyright` for Python type checking
- `cargo`, `rustfmt`, and `clippy` for Rust development

The default repo ergonomics should make the fast path the normal path.

## Competitive Research and UX Benchmarking Loop

SokoOdds should not design core money or trading surfaces from scratch in isolation. For every major user-facing flow, the team should review live benchmark products and translate those findings into local implementation choices.

Primary benchmark set:

- Polymarket for market discovery and trading surfaces
- Kalshi for contract trust and market-governance posture
- PredictIt for wording, closures, and surge handling
- 5050 Markets and Spreadhit for Kenya-native payment and category cues
- Bayse and Predicta for Africa-focused positioning and integrity patterns
- Stripe for calm financial UX, form clarity, and conversion-friendly trust design

Required workflow before major frontend implementation:

1. review at least two relevant benchmark products
2. capture screenshots or structured notes with browser tooling and, when practical, Playwright
3. write a short `copy / localize / avoid` design note
4. convert that note into component requirements and acceptance criteria

This should happen repeatedly across the roadmap, especially for onboarding, wallet, order entry, market detail pages, and admin resolution flows.

## Explicit Cross-Cutting Decisions

### Worker Service Definition

`apps/worker` is a separate deployable Python service, even if it initially shares a base image or workspace dependencies with `apps/api`.

It owns:

- settlement jobs
- reconciliation jobs
- payment follow-up tasks
- notifications
- stream consumers that are not latency-critical request handlers

Recommended v1 deployment shape:

- same codebase as `apps/api`
- same Docker image as `apps/api`
- different runtime command and health behavior

In local Compose and early production, the API container can run `uvicorn` while the worker container runs the background worker command from the same image. This keeps model and service code shared without blurring runtime ownership.

It should not be left ambiguous as “Celery inside the API” at the project-planning level. It may share code with `apps/api`, but it must have its own runtime entrypoint, health checks, and deployment controls.

### Idempotency Policy

For money-sensitive POST endpoints such as:

- `POST /orders`
- `POST /wallet/deposit`
- `POST /wallet/withdraw`
- admin resolution or payout-triggering actions

Use a client-supplied `Idempotency-Key` header.

Recommended behavior:

- frontend generates one UUID per user action and reuses it across retries for that action
- persist idempotency records durably in PostgreSQL
- scope keys by `user_id + route + key`
- enforce scope with a database-level unique constraint
- store a request hash so the same key cannot be reused with a different payload
- return the original success response for an exact replay
- return `409 Conflict` for the same key with a different payload
- keep keys for at least 24 hours for orders and at least 72 hours for payments
- clean up expired records on a schedule using `expires_at`

Redis may cache hot idempotency lookups, but PostgreSQL should remain the durable record.

### Engine Startup Ordering

The engine must not begin consuming live order events until startup is complete in this order:

1. database migrations complete
2. FastAPI and worker dependencies are reachable
3. Rust engine hydrates open books from PostgreSQL
4. last processed stream offset is loaded
5. engine begins consuming new stream entries
6. engine health endpoint flips to ready

If hydration is incomplete, the engine is not healthy.

If the engine is the active matching authority, FastAPI should reject or hold order-placement requests until the engine health state is `ready`.

### Resolution Evidence Rule

For v1, a market cannot be resolved without:

- selected outcome
- `resolution_source_url`
- `resolution_notes`
- audit identity of the resolving admin

Recommended escalation:

- for political or high-payout markets, require a second admin approval before final settlement execution

### Reconciliation Schedule and Alert Thresholds

Recommended minimum schedule:

- wallet-to-ledger reconciliation every 15 minutes
- payment reconciliation every 5 minutes
- full financial reconciliation report once daily

Recommended alert thresholds:

- alert if unreconciled ledger count is greater than `0` for more than 10 minutes
- alert immediately on any negative balance anomaly
- alert if any confirmed payment lacks matching wallet and ledger effects for more than 5 minutes

### WebSocket Sequence Design

Every market and user update sent over WebSockets should include a monotonic `sequence` number generated by the event projection layer.

Recommended ownership:

- the Rust engine owns the per-market sequence counter for engine-originated market events
- sequence should advance once for every emitted market event in that market
- user-scoped portfolio channels should maintain their own monotonic sequence stream

Recommended client behavior:

- track the last accepted sequence per subscribed channel
- drop any message with a sequence lower than the last accepted sequence
- use an explicit subscribe flow for market channels
- treat the immediate post-subscribe snapshot as the sequence baseline
- discard buffered messages where `sequence <= snapshot.sequence`
- request or trigger a refetch if a sequence gap is detected
- include `engine_emitted_at` on engine-originated market events so latency can be measured end to end

This should be designed before the realtime layer is implemented, not after.

### Closed Beta Operating Limits

Recommended initial Stage 2 limits:

- maximum invited beta users: `250`
- maximum open markets at once: `25`
- maximum single deposit: `KES 2,500`
- maximum daily deposit per user: `KES 10,000`
- maximum daily withdrawal per user: `KES 5,000`
- withdrawals above `KES 2,500` require manual review

These are starting values, not permanent rules, but code and operations need concrete defaults.

## Delivery Principles

### Product Principles

- trust before growth
- correctness before optimization
- mobile-first usability for Kenya and East Africa
- explicit market rules and resolution evidence
- auditable money movement at every stage

### Engineering Principles

- all money-sensitive operations are transactional
- ledger is append-only
- no balance is derived from cache alone
- FastAPI owns policy, auth, KYC, wallet, admin, payments, and resolution
- Rust owns matching, order-book state, and low-latency market computation
- Redis accelerates flows but never becomes financial truth

### Release Principles

- no public beta with real money before payout and reconciliation flows are proven
- every money-moving feature must pass security, integration, and rollback checks
- production rollout should use staged exposure and feature flags

## Sprint Model

Use 2-week sprints with:

- sprint planning on day 1
- engineering demo on day 9 or 10
- security and release review before closing the sprint
- backlog refinement in the second week

Each sprint should end with:

- merged code behind safe flags where necessary
- updated docs
- automated tests added
- observability added for new sensitive flows
- exit criteria signed off by engineering and product

## Roles and Ownership

### Product and Design

- define market categories, rules language, resolution evidence requirements
- define user flows for wallet, trading, KYC, and admin
- ensure the East African visual system stays modern and trustworthy

### Backend Team

- FastAPI services
- wallet and ledger logic
- payment integrations
- admin and moderation
- resolution and payout orchestration

### Engine Team

- Rust market engine
- in-memory order books
- matching
- market-state publishing
- replay and recovery logic

### Frontend Team

- Next.js application
- market browsing
- order entry
- wallet and portfolio
- realtime UX
- admin console

### Security and QA

- test strategy
- abuse-case design
- regression suite ownership
- release gate validation
- incident drills

## Delivery Roadmap

## Sprint 0: Inception and Controls

### Goal

Create the project guardrails before feature work begins.

### Deliverables

- finalize architecture and service boundaries
- create monorepo structure
- configure `pnpm`, `uv`, `Ruff`, `Pyright`, `pytest`, TypeScript checks, and Rust linting
- create `pnpm` workspace and lockfile strategy for frontend packages
- create Rust workspace standards with `cargo fmt`, `clippy`, and SQLx query checking
- configure Docker Compose for local development
- define service startup ordering for API, worker, migrations, and engine hydration
- define `apps/worker` as a separate runtime service with clear ownership
- define environment variable strategy
- define branching, CI, migration, and release workflow
- define ADR process for critical architecture changes
- define benchmark-review workflow for UI, wallet, and trust-sensitive features

### Security Deliverables

- secure coding checklist
- secrets management policy
- dependency update policy
- incident severity matrix
- logging and audit event taxonomy
- idempotency-key policy
- reconciliation schedule and alert policy
- WebSocket sequencing policy

### Exit Criteria

- local stack boots successfully
- CI runs lint, type checks, and tests
- secret scanning and dependency scanning are enabled
- no service starts without required env vars
- worker and engine startup contracts are documented
- benchmark-review template exists for future product sprints

## Sprint 1: Foundation and Identity

### Goal

Deliver the first trusted backend core without money movement yet.

### Deliverables

- FastAPI app skeleton
- PostgreSQL schema baseline
- Alembic migrations
- auth: register, login, refresh, current user
- user and session models
- wallet row creation on user registration
- admin role enforcement primitives
- Next.js app shell and auth-aware layout

### Security Focus

- password hashing
- JWT/session handling
- admin access control
- audit log skeleton
- brute-force protection on auth endpoints

### Exit Criteria

- users can register and sign in
- admin-only routes are server-enforced
- auth test suite passes
- audit events exist for login success, login failure, and admin access attempts

## Sprint 2: Markets and Read-Only Product

### Goal

Ship a trustworthy read-only product shell before trading.

### Deliverables

- market CRUD for admin
- market list and market detail endpoints
- market slugs and resolution metadata
- homepage, markets page, market detail page
- category filters and search baseline
- admin market management UI
- homepage and market-detail benchmark notes based on Polymarket, Stripe, and at least one Kenya-first competitor

### Security Focus

- broken object level authorization checks
- broken function level authorization checks
- input validation for market creation and editing
- content sanitization where rich text is allowed

### Exit Criteria

- admin can create and update markets
- non-admin users cannot access admin actions
- market detail page renders safely and performs well
- audit logs capture market lifecycle changes
- homepage and market detail pages reflect documented benchmark decisions around hierarchy, trust, and mobile clarity

## Sprint 3: Wallet, Ledger, and Order Intake

### Goal

Implement the financial primitives required for safe trading.

### Deliverables

- wallet service
- append-only ledger
- order intake API
- reserve-balance flow
- order status model and outbox events
- portfolio query skeleton
- frontend order ticket baseline
- durable idempotency table and middleware or dependency
- wallet and order-ticket benchmark notes based on Stripe plus at least one Kenya-first competitor

### Security Focus

- atomic order + wallet + ledger transaction
- idempotency keys for sensitive POSTs
- amount precision and rounding rules
- rate limits on order placement
- replay resistance for order submission
- same-key different-payload rejection

### Exit Criteria

- order placement reserves funds correctly
- no path can create negative available balance
- order intake emits durable events
- ledger entries reconcile with wallet state in tests
- replaying the same idempotency key returns the original response without duplicate effects
- wallet and order forms meet the documented clarity rules for status, timing, and payout preview

## Sprint 4: Trading Flow Proof and Realtime

### Goal

Prove the full trading loop end-to-end before Rust cutover.

### Deliverables

- temporary matcher path for proof of flow
- trade and position updates
- FastAPI WebSocket market feed
- live order book and recent trades UI
- realtime portfolio updates

### Security Focus

- WebSocket authentication
- origin and message validation
- per-connection limits
- race-condition testing around concurrent orders
- sequence-safe state updates

### Exit Criteria

- two users can place and match orders in a controlled environment
- reserved balances, fills, and positions reconcile correctly
- realtime feeds remain accurate under concurrent activity
- WebSocket abuse tests pass

## Sprint 5: Rust Engine Cutover

### Goal

Move matching and hot market-state logic into Rust without changing financial truth rules.

### Deliverables

- Rust engine scaffold
- order-book hydration on startup
- Redis Stream consumer
- price-time-priority matching
- market-state publication
- internal health and book-snapshot endpoints
- FastAPI worker to consume engine results and persist final durable effects
- startup readiness handshake between migrations, API, worker, and engine

### Security Focus

- stream replay safety
- duplicate event handling
- deterministic matching behavior
- recovery after crash or restart
- protection against stale or out-of-order engine results
- consume-only-after-hydration guarantees

### Exit Criteria

- engine can rebuild open books from PostgreSQL
- engine restart does not duplicate fills
- high-concurrency matching tests pass
- market updates remain consistent with persisted state
- engine never consumes live events before hydration and offset recovery complete

## Sprint 6: Payments and Wallet Funding

### Goal

Introduce deposits and withdrawals safely.

### Deliverables

- M-Pesa deposit initiation
- callback handler
- withdrawal initiation flow
- payment status tracking
- wallet transaction history
- reconciliation jobs

### Security Focus

- callback authenticity validation
- duplicate callback handling
- idempotent wallet crediting
- withdrawal approval rules
- fraud signal capture for unusual payment behavior

### Exit Criteria

- successful deposits credit wallets exactly once
- invalid callbacks are rejected and logged
- payment rows reconcile with wallet and ledger state
- failed and pending states are visible and recoverable

## Sprint 7: Resolution, Payouts, and Admin Controls

### Goal

Close the full financial loop from market creation to settlement.

### Deliverables

- market resolution workflow
- evidence and audit capture
- open-order cancellation on resolution
- resolution request queue and approval endpoints
- payout service
- fee calculation
- resolved market UX and portfolio settlement view
- stronger admin moderation tooling
- required resolution evidence fields in admin UI and API
- second-approver workflow for high-risk market categories or payout thresholds

### Security Focus

- admin guardrails for resolution
- pending-resolution market lock before settlement
- payout idempotency
- payout authorization and evidence requirements
- rollback-safe settlement jobs
- tamper-evident audit trail
- conflicting admin action handling

### Exit Criteria

- winning users receive correct payouts
- losing users do not receive payouts
- cancelled open orders release reserved funds correctly
- high-risk resolutions require a different approving admin before settlement begins
- settlement can be replayed safely without double-crediting
- markets cannot resolve without required evidence metadata

## Sprint 8: Hardening, Observability, and Beta Readiness

### Goal

Make the system resilient enough for controlled beta traffic.

### Deliverables

- structured security logging
- dashboards and alerting
- backup and restore runbooks
- reconciliation reports
- KYC review workflows
- mobile reliability polish
- feature flags and staged rollout controls
- reconciliation alert thresholds enforced in monitoring

### Security Focus

- pen test remediation
- log tamper protection
- restore drills
- disaster recovery checks
- abuse monitoring dashboards

### Exit Criteria

- beta release checklist passes
- restore drill completes within target time
- security backlog for launch is at acceptable residual risk
- on-call and incident process is rehearsed

## Sprint 9: Public Launch Readiness

### Goal

Prepare for limited production launch with clear operating discipline.

### Deliverables

- final launch checklist
- production environment hardening
- go-live runbook
- support and incident routing
- settlement and finance reconciliation runbook

### Security Focus

- final dependency and secret review
- production access review
- DDoS and rate-limit tuning
- red-team or external assessment review

### Exit Criteria

- launch readiness review is approved
- production change freeze rules are agreed
- rollback and incident contacts are confirmed

## Quality and Security Strategy

Security for SokoOdds should use a layered verification model:

1. static and dependency checks in CI
2. unit tests for business rules
3. integration tests for service and database boundaries
4. contract tests for REST, event, and WebSocket payloads
5. end-to-end tests for user journeys
6. abuse-case and adversarial tests for money and auth flows
7. pre-release manual penetration testing

## Test Pyramid

### Static Controls

- `Ruff` linting and formatting
- `Pyright` type checking
- TypeScript checks
- Rust `clippy` and formatting
- secret scanning
- dependency vulnerability scanning

### Unit Tests

- wallet balance math
- ledger append behavior
- fee calculations
- payout calculations
- order validation
- slug generation
- auth token utilities

### Integration Tests

- database transactions
- Alembic migrations
- Redis Streams publishing and consumption
- engine result consumption
- payment callback persistence
- settlement jobs

### End-to-End Tests

- sign up to funded wallet
- deposit to available balance
- order placement to reserved balance
- partial fill to open position
- market resolution to payout
- withdrawal initiation and status visibility
- reconnect WebSocket client and reject stale updates by sequence

## Money-Safety Release Gates

No money-moving feature may ship unless all of the following pass:

- automated unit and integration tests
- concurrency tests for race conditions
- idempotency tests
- rollback and retry tests
- audit-log verification
- manual QA checklist
- security review for abuse paths

## Detailed Security Test Cases

## 1. Authentication and Session Security

### Test Cases

- reject invalid passwords and expired tokens
- revoke refresh tokens on logout or account lock
- reject reused refresh tokens if rotation is enabled
- throttle repeated failed logins by IP and by account
- ensure password reset or admin disable invalidates active sessions
- verify admin claims are checked server-side, not trusted from client payloads

### Expected Outcomes

- no session survives invalidation events
- login abuse does not enable account takeover
- admin access is impossible without server-side authorization

## 2. Authorization and API Security

### Test Cases

- user A cannot read or mutate user B wallet, orders, positions, or KYC records
- non-admins cannot access admin routes
- admin users cannot exceed scoped permissions unintentionally
- object identifiers cannot be guessed to gain access
- hidden or deprecated endpoints are rejected unless explicitly enabled

### Expected Outcomes

- BOLA and broken function-level authorization issues are blocked
- sensitive APIs expose only data appropriate to the caller

## 3. Wallet and Ledger Integrity

### Test Cases

- placing an order moves funds from `available_balance` to `reserved_balance`
- cancelling an order releases reserved funds exactly once
- partial fills reduce reserved balances correctly
- every balance-changing action creates a matching ledger entry
- ledger is append-only and cannot be updated or deleted by normal app paths
- wallet totals reconcile from ledger history
- negative balances are impossible under normal and concurrent flows

### Expected Outcomes

- wallets always reconcile against the ledger
- no flow can create or destroy money silently

## 4. Order Intake and Matching Security

### Test Cases

- reject orders on paused, closed, expired, or resolved markets
- reject prices outside allowed bounds
- reject malformed decimal precision
- reject orders above max exposure
- reject duplicate client submissions with same idempotency key
- submit many concurrent orders for one user and verify no overspend occurs
- replay old `order.created` events and verify duplicate execution does not happen
- restart the engine during load and verify books and offsets recover safely

### Expected Outcomes

- order intake remains deterministic
- matching cannot overspend user funds
- restart and replay do not create phantom trades

## 5. Trade, Position, and Payout Safety

### Test Cases

- partial fills update `filled_quantity` and positions correctly
- full fills close orders correctly
- realized and unrealized P&L calculations remain accurate
- settlement pays only winning positions
- losing positions do not receive funds
- settlement retries do not double-credit winners
- platform fee is applied exactly once where configured

### Expected Outcomes

- trade and payout math remains correct through retries and failures
- settlement jobs are idempotent

## 6. Payment and Callback Security

### Test Cases

- invalid M-Pesa callbacks are rejected
- duplicate valid callbacks do not double-credit wallets
- mismatched provider reference or amount is quarantined for review
- deposit pending, confirmed, and failed states transition correctly
- withdrawal attempts above balance are blocked
- suspicious withdrawal bursts trigger review controls
- callback handler logs provenance and correlation ids
- payment idempotency keys survive retries across service restarts

### Expected Outcomes

- payment confirmation is trustworthy
- external provider retries cannot create duplicate credits

## 7. WebSocket and Realtime Security

### Test Cases

- reject unauthorized WebSocket connections
- enforce allowed origins
- reject oversized messages and invalid payloads
- cap subscriptions per connection
- flood channels to verify rate limiting and graceful degradation
- expire live sessions and ensure sockets are closed or re-authenticated
- verify sequence numbers prevent stale book replacement
- verify sequence gaps trigger snapshot refresh or refetch logic

### Expected Outcomes

- realtime feeds stay authenticated, bounded, and abuse-resistant
- WebSockets cannot be used to bypass API security

## 8. Admin and Moderation Security

### Test Cases

- only admins can create, pause, resolve, or edit markets
- every admin action writes an audit record
- resolving a market requires outcome and evidence
- two admins attempting conflicting actions are handled safely
- high-risk resolutions require second approval when configured
- high-risk actions can require step-up confirmation before execution

### Expected Outcomes

- privileged actions are traceable and hard to misuse
- admin mistakes are detectable and recoverable

## 9. Data Protection and Secrets

### Test Cases

- secrets are not committed to git
- environment-specific secrets are separated
- secret rotation does not break services
- sensitive data is masked in logs
- backups are encrypted and access-controlled

### Expected Outcomes

- operational secrets remain manageable, auditable, and revocable

## 10. Logging, Monitoring, and Auditability

### Test Cases

- log successful and failed auth attempts
- log order placement, cancel, trade, payout, and admin resolution events
- ensure logs include actor, target, action, outcome, correlation id, and timestamp
- verify logs cannot be used for injection or resource exhaustion
- simulate logging sink failure and ensure app behavior fails safely

### Expected Outcomes

- security events are visible
- incident responders can reconstruct what happened

## 11. Backup, Recovery, and Reconciliation

### Test Cases

- restore PostgreSQL backup into a clean environment
- rebuild engine books from persisted open orders
- recover from a saved stream offset after engine restart
- run wallet-to-ledger reconciliation after simulated failures
- run payment reconciliation against provider references

### Expected Outcomes

- the platform can recover from crashes without corrupting financial state
- operators can prove balances and payouts after incidents

## 12. Performance and Resource Abuse

### Test Cases

- login brute-force under rate limiting
- burst order placement by one account and many accounts
- market hot-spot testing on one high-volume market
- WebSocket connection flooding
- oversized request bodies and message frames
- settlement job load testing on large winning-position sets

### Expected Outcomes

- system degrades safely
- resource abuse does not lead to silent balance corruption or broad outage

## Definition of Done for Sensitive Features

A feature touching money, auth, or admin power is not done until:

- code is merged
- tests are added and passing
- failure and retry behavior is covered
- logs and metrics are added
- dashboard or alert coverage exists where needed
- docs and runbooks are updated
- security review is completed

## Non-Negotiable Controls Before Real-Money Launch

- append-only ledger in production
- reconciliation jobs running
- idempotent payment confirmation flow
- idempotent settlement flow
- least-privilege production access
- encrypted backups and restore rehearsal
- on-call incident response ownership
- external security review or penetration test
- legal and compliance review for the operating jurisdictions

## Recommended Metrics

### Product and Reliability

- active markets
- trade execution latency
- order reject rate
- WebSocket disconnect rate
- payment confirmation latency

### Financial Integrity

- unreconciled ledger count
- unreconciled payment count
- duplicate callback rejection count
- payout retry count
- negative balance anomaly count

### Security

- failed login bursts
- admin action count
- rate-limit trigger count
- suspicious order burst count
- invalid callback count

## Rollout Plan

### Stage 1

- internal environment only
- fake funds only
- seeded markets only

### Stage 2

- closed beta
- restricted users
- low deposit and withdrawal limits
- manual operational review for payouts
- initial operating limits:
- invited users capped at `250`
- single deposit capped at `KES 2,500`
- daily deposit capped at `KES 10,000`
- daily withdrawal capped at `KES 5,000`
- maximum open markets capped at `25`
- withdrawals above `KES 2,500` require manual review

### Stage 3

- broader beta
- automated monitoring and reconciliation
- controlled market expansion

### Stage 4

- public launch after operational stability, security review, and finance reconciliation targets are met

## Risks to Watch Early

- race conditions between order intake and matching
- duplicate payment callbacks
- settlement replay bugs
- authorization gaps in admin and user data access
- stale realtime state causing misleading trade UX
- reconciliation drift between wallet and ledger
- mobile network instability causing duplicate user submissions

## References

This concept paper is aligned to current security guidance and should be reviewed against these primary references during implementation:

- OWASP API Security Top 10 2023: [owasp.org/API-Security](https://owasp.org/API-Security/)
- OWASP Authentication Cheat Sheet: [cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- OWASP Transaction Authorization Cheat Sheet: [cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)
- OWASP WebSocket Security Cheat Sheet: [cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- OWASP Logging Cheat Sheet: [cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- OWASP Secrets Management Cheat Sheet: [cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- NIST Secure Software Development Framework: [csrc.nist.gov/pubs/sp/800/218](https://csrc.nist.gov/pubs/sp/800/218)
