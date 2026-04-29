# SokoOdds Sprint Backlog

## Purpose

This backlog translates the concept paper, frozen architectural decisions, and benchmark research into implementation-ready sprint tickets with clear acceptance criteria.

It is written for a money-moving, realtime product. That means the backlog must optimize for:

- financial correctness
- replay safety
- auditability
- mobile reliability
- trust-first UX
- staged rollout discipline

## How To Use This Backlog

- Each sprint assumes a 2-week cycle.
- Tickets are intentionally scoped so engineering, design, QA, and security can use the same document.
- A ticket is not done when the feature "works once." It is done when the acceptance criteria, tests, and observability expectations are met.
- No money-moving feature should be merged without matching tests and rollback-safe behavior.

## Cross-Cutting Best Practices

These rules apply across all sprints.

### Financial Integrity Rules

- PostgreSQL is the only durable source of truth for money, positions, payouts, and idempotency.
- Redis may accelerate reads, fanout, and workflows, but it never becomes the final record for money.
- Wallet and ledger mutations must happen in one durable transaction.
- Ledger history is append-only.
- Reserved balance is explicit and user-visible in both product behavior and internal state.

### Architecture Rules

- `apps/web` uses `pnpm`.
- `apps/api` and `apps/worker` use `uv`, `Ruff`, `Pyright`, and `pytest`.
- `apps/worker` is a separate runtime service.
- V1 worker deployment uses the same codebase and image as `apps/api`, but a different runtime command.
- The Rust engine owns low-latency matching and per-market event sequencing once it is introduced.

### Reliability Rules

- Every money-sensitive POST requires `Idempotency-Key`.
- Frontend generates one UUID per user action and reuses it across retries for that action.
- Idempotency records are durable in PostgreSQL.
- Engine-originated market messages include a monotonic per-market `sequence`.
- WebSocket gaps trigger HTTP snapshot refresh.
- Order intake can be gated on engine readiness.

### UX Rules

- Use benchmark review before major frontend implementation.
- Keep trust information close to the action surface.
- Keep KES, balance states, payout preview, and next-step messaging explicit.
- Prefer mobile-first layout and low-bandwidth-friendly behavior over desktop-only density.

## Definition Of Done

A ticket is only done when all applicable items below are true:

- code is merged behind safe defaults or feature flags where needed
- tests covering the new behavior exist
- logs and metrics are added for sensitive flows
- docs are updated if contracts, flows, or operational behavior changed
- failure and replay behavior are defined for money-sensitive work
- acceptance criteria are demonstrably met

## Current Delivered Slice

As of March 20, 2026, the repo has already delivered part of Sprint 2 and Sprint 3 in running code.

Current shipped behavior:

- public market list and detail APIs are live
- homepage, markets page, and market detail page are API-backed
- homepage now leads with a discovery-first `All markets` feed instead of a large hero
- homepage now uses a thin signal strip for `Trending now` and `Ending soon` before the main board instead of a promotional hero panel
- shared card surfaces use a calmer ivory modular style with soft borders and glanceable YES/NO actions
- the launch catalogue has been expanded so the homepage and market board feel populated while still staying grounded in East Africa-relevant categories
- category chips now filter in place on the board, and urgency now lives in the signal strip instead of repeating lower on the page
- homepage search and top navigation now drive the same in-place discovery state as the market board
- signal-strip shortcuts now focus the homepage board in place, and the active shortcut stays visible for focused boards such as `Trending politics` and `Ending soon economy`
- homepage discovery state now also syncs to URL params, so filtered landing-page views can be copied, reloaded, and shared
- header microcopy now reflects the active discovery state so the focused board reads like part of one continuous market surface
- search placeholder and empty-state copy now inherit the active board context, reducing generic copy on focused discovery flows
- the `/markets` catalog now inherits the same signal-strip language in a quieter, flatter variant so discovery feels consistent across both entry surfaces
- `/markets` discovery state now syncs to URL params so filtered catalog boards can be reloaded, bookmarked, and shared
- discovery updates now use a softer transition so title, count, and grid changes feel less abrupt
- the homepage feature market is now materially quieter, with one probability story, one short context note, and less commentary density
- the footer is now shorter and less brochure-like, so the landing page keeps a tighter market-product feel
- market detail uses a first-visit WhatsApp prompt with dismissal persistence
- the order ticket can open a lightweight account setup flow
- the web app uses same-origin proxy routes plus an HTTP-only session cookie for account state
- first-time M-Pesa verification credits `KES 5.00` once and returns the user to a wallet-ready order ticket
- verified users can now initiate a small M-Pesa top-up through a real deposit record and callback lifecycle while keeping the same wallet-sheet UX
- callback handling now supports token validation, optional body-signature verification, and allowlisted source IP enforcement for safer Daraja ingestion
- the market page can submit a first authenticated sample order and reflect available versus reserved balances
- verified wallets can now initiate a first withdrawal request, move the amount into reserved funds, and complete a small B2C-style payout path in stub mode
- the wallet sheet now exposes a compact activity rail for verification credits, top-ups, and withdrawals so users can see recent money movement without leaving the market flow
- the wallet sheet now supports a first lightweight KYC submission step, and the API includes admin review endpoints plus a feature-flagged order gate for approved KYC
- the web app now includes a minimal `/admin/kyc` review board backed by the same account session flow, so allowlisted admins can approve or reject KYC profiles without leaving the product UI
- the web app now includes a minimal `/admin/support` board so allowlisted admins can inspect recent deposit and withdrawal states from the same session-backed product shell
- allowlisted admins can now approve or reject `review_required` withdrawals from `/admin/support`, with wallet release or payout initiation handled in the backend
- reviewed payout items on `/admin/support` now show a compact review trail so support can see who acted and when without dropping to the database
- `/admin/support` now includes a small triage layer for `Needs review`, `Reviewed`, and `Failed`, so payout ops can narrow the queue quickly without turning the page into a heavy case-management surface
- the web app now includes a first `/portfolio` surface, so signed-in users can review wallet cash, reserved funds, KYC status, recent money movement, and open-order exposure outside the market-sheet overlay
- the web app now includes an account-aware `/cash` surface, so funding, withdrawals, wallet readiness, and recent ledger activity can be reviewed outside the onboarding sheet as well
- market detail now uses API-backed holders and durable market comments with likes, hide/restore moderation, and one-level replies
- the web app now includes an admin market-comment review queue plus signed-in persistence for followed comment threads and catch-up state
- the `For you` discovery surface now includes cross-market reply alerts for followed threads, backed by the account session
- admins can now hide and restore replies directly inside the market-detail thread view without leaving the conversation
- the market-detail ticket now supports real position-backed sell orders for held `YES` and `NO` shares instead of a visual-only sell mode

Still pending in later sprints:

- full JWT auth and refresh flows
- realtime WebSocket trading surfaces
- withdrawal and full payout Daraja payment flows
- richer KYC document collection, evidence handling, and support tooling

## Sprint 0: Inception and Controls

### Goal

Freeze non-negotiable architectural decisions before feature work expands.

### `S0-01` Monorepo and Tooling Bootstrap

Scope:

- create `pnpm` workspace baseline for frontend
- create `uv` workspace baseline for Python services
- create Rust crate baseline for market engine
- add root ignore rules and shared scripts

Acceptance criteria:

- repo has root `package.json`, `pnpm-workspace.yaml`, `.python-version`, `pyproject.toml`, and `pyrightconfig.json`
- `apps/web`, `apps/api`, `apps/worker`, and `apps/market-engine` exist
- starter commands are documented in repo docs

### `S0-02` CI and Quality Gates

Scope:

- define lint, typecheck, and test commands per stack
- document required checks for merge

Acceptance criteria:

- frontend commands use `pnpm`
- Python commands use `uv`
- Rust commands use `cargo fmt`, `cargo clippy`, and `cargo test`
- required checks are listed for PR and release gating

### `S0-03` Cross-Cutting Control Decisions

Scope:

- freeze decisions for idempotency
- define worker-service ownership
- define engine startup ordering
- define WebSocket sequencing rules
- write decision outputs in explicit ADR-style files:
  - `docs/decisions/idempotency.md`
  - `docs/decisions/worker-runtime.md`
  - `docs/decisions/engine-startup-ordering.md`
  - `docs/decisions/websocket-sequencing.md`

Acceptance criteria:

- the four decisions above exist as concrete decision files with named owners and last-updated dates
- each decision file includes inputs, final decision, rejected alternatives, and implementation notes
- no critical money or realtime behavior is left ambiguous
- same-image different-command worker deployment is explicitly documented for v1

### `S0-04` Benchmark Review Workflow

Scope:

- define benchmark sites by feature area
- define screenshot and note-taking workflow using browser tools and Playwright when practical
- define `copy / localize / avoid` note template

Acceptance criteria:

- the team has a benchmark checklist for homepage, market detail, wallet, order ticket, and admin resolution flows
- benchmark notes are required before major frontend implementation starts

### `S0-05` Release And Runbook Baseline

Scope:

- define release workflow
- define rollback expectations
- define initial incident ownership

Acceptance criteria:

- release steps are written down
- rollback owner is named
- finance-impacting incidents have an escalation path

## Sprint 1: Foundation and Identity

### Goal

Deliver the first trusted backend and frontend shell without money movement yet.

### `S1-01` FastAPI App Bootstrap

Scope:

- create FastAPI app factory
- add `/api/v1/health`
- add shared config module

Acceptance criteria:

- app starts locally
- health endpoint returns `200`
- config loads from env

### `S1-02` Database Baseline And Migration Setup

Scope:

- define initial database connectivity
- configure async session factory
- create first Alembic baseline
- create the first real migration for `users`, `wallets`, and `sessions`
- document canonical DB URL format

Acceptance criteria:

- SQLAlchemy async engine exists
- Alembic is configured
- startup fails loudly when DB config is missing
- baseline migration can create the initial schema set
- `users`, `wallets`, and `sessions` tables exist in the database
- migrations run cleanly on an empty database

### `S1-03` Working Auth and Session Flow

Scope:

- register, login, refresh, and current-user routes
- JWT issuance and refresh handling
- `get_current_user` dependency backed by the database
- server-side admin guard stub

Acceptance criteria:

- register and login work end-to-end against the database
- refresh returns a valid renewed token or session artifact
- `get_current_user` resolves a real user from persisted auth state
- admin-only dependency pattern is defined

### `S1-04` Web App Shell

Scope:

- Next.js app shell
- global styles
- homepage placeholder or first benchmark-led shell

Acceptance criteria:

- `pnpm --filter web dev` starts the app
- root layout renders
- homepage loads without runtime errors

### `S1-05` Worker Runtime Baseline

Scope:

- define worker runtime modes
- make ownership visible in code
- create task stubs for settlement, reconciliation, payment follow-up, notifications, and engine-result consumption

Acceptance criteria:

- worker runtime fails loudly on unknown modes
- worker entrypoint is separate from API entrypoint
- v1 deployment pattern is documented as same image, different command

## Sprint 2: Markets and Read-Only Product

### Goal

Ship a trustworthy read-only product shell before trading.

### `S2-01` Market Data Model

Scope:

- market entity fields
- slug rules
- resolution metadata fields
- market status enum

Acceptance criteria:

- schema fields align with implementation guide
- market states cover draft, open, paused, closing, resolved, void
- source and evidence fields are modeled for later settlement use

### `S2-02` Market Read APIs

Scope:

- list markets
- get market by slug
- query filters for category, status, search, and sort

Acceptance criteria:

- endpoint contracts are documented
- list and detail routes exist
- non-admin access works for public markets

### `S2-03` Market Admin CRUD

Scope:

- create market
- edit market
- pause market

Acceptance criteria:

- admin-only guard is enforced server-side
- audit event hook exists for market changes
- rules and resolution metadata are required at creation time

### `S2-04` Read-Only Frontend Pages

Scope:

- homepage
- markets list page
- market detail page
- admin market management placeholder
- benchmark-led hierarchy inspired by Polymarket and Stripe
- discovery-first landing page with the market feed above long-form marketing copy
- calmer modular card system inspired by premium ivory UI references, localized for market scanning
- first-visit community prompt for market-detail pages
- browser-review loop using Playwright screenshots or checks before sign-off
- move the highest-value read path from mock data to API-backed market pages as soon as list and detail APIs are stable

Acceptance criteria:

- pages render mock or API-backed data
- market rules and resolution source are visible on detail pages
- homepage uses documented benchmark choices for discovery, hierarchy, and trust framing
- homepage first viewport shows live markets immediately with no oversized hero blocking the feed
- card design stays minimal, dense, and readable on desktop and mobile
- first market-detail visit can promote WhatsApp or equivalent alerts without repeating on every refresh
- a browser-level check exists for homepage and market-detail rendering
- current repo slice: pages are already API-backed and browser-checked with Playwright

### `S2-05` Market Trust Surfaces

Scope:

- rules card
- resolution source card
- market status presentation
- fairness and trust copy

Acceptance criteria:

- users can see what resolves a market without hunting through the page
- close time, status, and source are visible near the primary action area

## Sprint 3: Wallet, Ledger, and Order Intake

### Goal

Implement the financial primitives required for safe trading.

### `S3-01` Wallet and Ledger Core

Scope:

- wallet model with available and reserved balances
- append-only ledger model
- helper methods for reserve, release, credit, and debit

Acceptance criteria:

- wallet operations are transaction-safe
- no normal code path mutates ledger history in place
- balances can be reconciled from ledger history

### `S3-02` Durable Idempotency

Scope:

- persist `Idempotency-Key` records in PostgreSQL
- optionally cache hot lookups in Redis
- replay original responses
- reject same-key different-payload requests
- document frontend UUID generation behavior
- enforce `user_id + route + key` with a database-level unique constraint
- define TTL behavior:
  - order keys retained for at least 24 hours
  - payment keys retained for at least 72 hours
- add cleanup or expiry handling for old idempotency records using `expires_at`

Acceptance criteria:

- exact replays return original response
- mismatched payload reuse returns `409`
- Redis is optional cache only, not durable truth
- a request with an expired key is accepted as a new action after the retention window
- retention behavior is covered in tests or scheduled cleanup logic
- concurrent identical requests rely on the unique constraint and replay the stored response safely
- behavior is documented in API contracts

### `S3-03` Order Intake API

Scope:

- validate market state
- validate KYC gate
- validate wallet-readiness gate for the first live onboarding flow
- validate price and quantity
- reserve funds and write order intent
- append ledger entry
- append outbox event
- return a deterministic order submission response with cost information

Acceptance criteria:

- order placement creates order, ledger, reserve effect, and outbox event atomically
- orders cannot overspend available balance
- replaying the same key does not create duplicate side effects
- success response includes the fields needed by the order ticket to render cost and reserve state
- current onboarding flow blocks authenticated users from placing live orders before M-Pesa verification completes
- KYC enforcement is feature-flagged or environment-gated until the full KYC workflow is live

### `S3-04` Order Ticket UI

Scope:

- buy or sell input
- price and quantity controls
- confirmation surface
- Stripe-style clarity for validation, payout preview, and next-step messaging
- first-time account and wallet-readiness states before live order submission
- progressive CTA states like `create account`, `verify M-Pesa`, `top up`, and `ready to trade`
- same-origin web bridge for session-aware account actions and order submission
- HTTP-only cookie session handling for the lightweight onboarding flow

Acceptance criteria:

- UI shows cost, payout, and balance impact clearly
- submission uses an idempotency key generated per user action
- available and reserved balance language is clear before submission
- the order ticket can clearly explain why the user cannot trade yet and what step comes next
- first-time account setup can complete a KES 5 verification flow and return the user to the market as `wallet ready`
- current repo slice: a verified user can submit the sample market order from the UI and see reserved funds update immediately

### `S3-05` Outbox Publisher Baseline

Scope:

- define outbox event shape
- worker or publisher stub for `order.created`

Acceptance criteria:

- accepted orders always create a pending outbox row
- outbox status can be observed and retried safely

### `S3-06` Order Cancellation API

Scope:

- authenticated `DELETE /api/v1/orders/{id}`
- ownership and cancelable-state validation
- durable `order.cancel_requested` outbox event
- cancellation-request response contract

Acceptance criteria:

- only the owning user can request cancellation
- only `submitted`, `accepted`, `queued_for_matching`, and `partially_filled` orders can be cancelled
- accepted cancellations return `202 Accepted` with `cancellation_requested`
- reserve release happens only after durable processing of `order.cancelled`

## Sprint 4: Trading Flow Proof and Realtime

### Goal

Prove the full trading loop end-to-end before Rust cutover.

### `S4-01` Temporary Matching Flow

Scope:

- prove fills, positions, and market updates end-to-end before Rust cutover
- keep the temporary Python matching path isolated so it can be removed cleanly in Sprint 5

Acceptance criteria:

- two test users can produce trades in a controlled environment
- positions and wallet effects reconcile correctly

### `S4-02` FastAPI WebSocket Gateway

Scope:

- market subscriptions
- connection manager
- origin and auth checks
- explicit subscribe and unsubscribe messages
- immediate snapshot on successful market subscription
- emit monotonically increasing `sequence` values on every outbound market broadcast during the temporary matcher phase

Acceptance criteria:

- WebSocket auth is enforced
- clients can subscribe to a market and receive updates
- every outbound market message contains a `sequence` field
- the client protocol for subscribe, unsubscribe, and subscribed acknowledgement is documented
- market subscriptions receive a snapshot baseline before incremental updates

### `S4-03` Frontend Sequence-Aware WebSocket Hook

Scope:

- track `lastSeq` per market channel
- discard stale messages
- trigger snapshot refresh on gaps

Acceptance criteria:

- client drops stale messages using sequence tracking
- gap handling falls back to HTTP snapshot refresh
- out-of-order updates do not replace newer state on the screen

### `S4-04` Live Market UI

Scope:

- order book
- recent trades
- current position

Acceptance criteria:

- market page updates live without refresh
- live UI remains readable and stable on reconnect

## Sprint 5: Rust Engine Cutover

### Goal

Move matching and hot market-state logic into Rust without weakening financial truth rules.

### `S5-01` Rust Engine Bootstrap

Scope:

- Axum service
- health endpoint
- tracing setup

Acceptance criteria:

- engine builds and boots
- internal health endpoint reports `hydrating` and `ready`

### `S5-02` Book Hydration and Offset Recovery

Scope:

- load open orders from PostgreSQL
- rebuild books before live consumption
- restore last processed stream offset from PostgreSQL `engine_state`

Acceptance criteria:

- engine does not consume new events before hydration completes
- restart does not reprocess already finalized events blindly
- health endpoint exposes `books_loaded` and readiness state
- last processed offset survives a full Redis flush and engine restart

### `S5-03` Matching Engine

Scope:

- price-time priority
- partial fills
- market-state publication
- per-market sequence emission

Acceptance criteria:

- matching is deterministic for a fixed event sequence
- trade execution events include enough data for durable finalization
- engine-originated market events carry monotonic per-market `sequence`

### `S5-04` API Readiness Gate

Scope:

- engine health lookup from API
- order intake gate based on readiness
- health surface for order-intake state

Acceptance criteria:

- API can expose whether order intake is enabled
- order placement can be blocked or held until engine state is `ready`
- engine unreachability is visible in health responses

### `S5-05` Engine Result Consumer

Scope:

- worker consumes engine results
- persists final trade, position, and ledger effects

Acceptance criteria:

- duplicate engine messages do not duplicate financial effects
- wallet, position, and trade state reconcile after fill

### `S5-06` Remove Temporary Python Matcher

Scope:

- remove the temporary Python matching path from `apps/api`
- keep only validation, order intake, and durable state ownership in FastAPI

Acceptance criteria:

- no matching logic remains in FastAPI request handlers or services
- Rust is the only active matching authority once cutover is enabled

## Sprint 6: Payments and Wallet Funding

### Goal

Introduce deposits and withdrawals safely.

### `S6-01` Deposit Initiation

Scope:

- M-Pesa deposit request model
- payment record creation
- mobile-first funding UX with clear pending and success states
- first-time KES 5 phone-verification flow before normal wallet funding
- copy that explains the verification amount is credited back to the wallet after success

Acceptance criteria:

- initiation is idempotent
- payment state starts as pending
- deposit screens explain amount, status, and expected completion clearly
- first-time wallet setup can distinguish between phone verification and normal wallet top-up

### `S6-02` Callback Processing

Scope:

- validate callback origin and payload
- confirm payment
- credit wallet and ledger once

Acceptance criteria:

- duplicate callbacks do not double-credit
- mismatched amount or reference is quarantined
- payment confirmation, wallet credit, and ledger write happen in one durable flow

### `S6-03` Withdrawal Flow

Scope:

- withdrawal request
- approval rules
- manual-review thresholds
- Daraja B2C payout initiation for approved withdrawals

Acceptance criteria:

- insufficient-balance withdrawals are rejected
- review-required withdrawals enter the correct state
- withdrawal initiation is idempotent
- approved withdrawals trigger a real or sandbox Daraja B2C call

### `S6-04` Stuck Payment Follow-Ups

Scope:

- worker task for stuck `pending` states
- status checks and retry-safe updates

Acceptance criteria:

- pending payments can be checked or recovered without duplicate crediting
- worker ownership of payment follow-ups is explicit

## Sprint 7: Resolution and Payouts

### Goal

Close the full financial loop from market creation to settlement.

### `S7-01` Resolution Workflow

Scope:

- required outcome
- required evidence fields
- audit capture
- public-facing trust surfaces for resolution source and notes

Acceptance criteria:

- market cannot resolve without `resolution_source_url` and `resolution_notes`
- resolver identity is stored
- market detail pages show resolution evidence in a clear, user-readable format

### `S7-02` High-Risk Approval Rule

Scope:

- optional second-admin approval for high-payout or political markets
- resolution request queue and approval actions
- `pending_resolution` market behavior during review

Acceptance criteria:

- rule is configurable
- conflicting admin actions are rejected safely
- high-risk markets can enter `pending_second_approval`
- a different admin is required to approve a high-risk resolution
- rejected approvals return the market to a defined tradable state

### `S7-03` Payout Service

Scope:

- cancel open orders
- release reserves
- pay winners
- apply fees

Acceptance criteria:

- settlement is idempotent
- losing positions never receive payout
- remaining open orders are cancelled before payout settlement starts
- payout effects are fully reflected in wallet and ledger state

### `S7-04` KYC Review Workflow

Scope:

- user KYC document upload endpoint
- admin review queue
- approve or reject action with audit logging
- user notification on decision

Acceptance criteria:

- users have a real path from `pending` to `approved` or `rejected`
- admin KYC actions are auditable
- order-intake KYC gating can rely on an actual workflow, not only a stubbed status

## Sprint 8: Hardening and Beta Readiness

### Goal

Make the system resilient enough for controlled beta traffic.

### `S8-01` Reconciliation Jobs

Scope:

- wallet-to-ledger reconciliation
- payment reconciliation
- alert thresholds

Acceptance criteria:

- unreconciled ledger count alerts after 10 minutes
- negative balance anomalies alert immediately
- reconciliation jobs are owned by the worker runtime, not API request paths

### `S8-02` Observability

Scope:

- structured logs
- correlation IDs
- security and financial dashboards

Acceptance criteria:

- order, trade, payout, and callback flows are traceable end-to-end
- logs allow correlation across API, worker, and engine

### `S8-03` Closed Beta Controls

Scope:

- invited-user caps
- deposit and withdrawal limits
- open-market caps

Acceptance criteria:

- configured limits default to:
  - invited users capped at `250`
  - single deposit capped at `KES 2,500`
  - daily deposit capped at `KES 10,000`
  - daily withdrawal capped at `KES 5,000`
  - open markets capped at `25`
  - withdrawals above `KES 2,500` require manual review
- admin can tighten or loosen limits without code changes

### `S8-04` Integration Test Gate

Scope:

- async database-level tests for order intake
- replay safety tests
- callback and settlement regression tests

Acceptance criteria:

- CI includes service-level tests for wallet, ledger, outbox, and idempotency
- no money-moving release can pass without integration-test coverage

## Sprint 9: Public Launch Readiness

### Goal

Prove launch readiness across engineering, product, support, and finance operations.

### `S9-01` Launch Checklist

Scope:

- final review across product, engineering, finance, and support
- produce `docs/runbooks/launch.md`

Acceptance criteria:

- all non-negotiable launch controls are signed off
- release gates for money-moving flows are explicitly approved
- `docs/runbooks/launch.md` contains the sign-off checklist and named owners

### `S9-02` Incident and Rollback Readiness

Scope:

- rollback steps
- on-call ownership
- finance reconciliation runbook
- produce:
  - `docs/runbooks/rollback.md`
  - `docs/runbooks/reconciliation.md`

Acceptance criteria:

- launch team can execute rollback and reconciliation drills successfully
- rollback path covers API, worker, engine, and payment-side failures
- an engineer not involved in the original implementation can follow the runbooks successfully

## Non-Negotiable Release Gates

No real-money launch should proceed unless these are true:

- durable idempotency is live for all money-sensitive POSTs
- worker ownership for settlement and reconciliation is in place
- engine readiness gating is in place before Rust owns matching
- WebSocket sequence rules are implemented on both producer and client sides
- wallet, ledger, order, and payout effects reconcile in automated tests
- audit logs exist for admin resolution and payout-triggering actions
