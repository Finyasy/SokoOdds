# Core API Contracts

## Purpose

This document defines the critical API and event contracts that must stay stable across implementation phases.

Where an ADR already exists, this document mirrors the accepted decision at the integration boundary so API, worker, engine, and frontend teams can implement against one shared contract.

## 1. Idempotency Contract

### Applies To

- `POST /api/v1/orders`
- `POST /api/v1/wallet/deposit`
- `POST /api/v1/wallet/withdraw`
- `GET /api/v1/wallet/transactions`
- `POST /api/v1/admin/markets/{id}/resolve`

### Request Header

```http
Idempotency-Key: 9f0c6b2a-b9c1-4c1d-8e5b-0b6cf8f2f2d5
```

### Client Rules

- the frontend generates one UUID per user action
- retries for the same deposit, withdrawal, resolution submission, or order submission must reuse the same key
- a new user action must generate a new key

### Server Rules

- scope uniqueness by `user_id + route + key`
- enforce the scope with a database-level unique constraint
- store a deterministic request hash with the idempotency record
- store the original response status code and full response body with the record
- on exact replay, return the original status code and response body verbatim
- include `X-Idempotency-Status: created` on first execution
- include `X-Idempotency-Status: replayed` on exact replay
- on same key with different payload, return `409 Conflict`
- store keys durably in PostgreSQL
- Redis may cache hot lookups, but it is not the durable source of truth for idempotency

### Retention and Cleanup

- order keys are retained for at least 24 hours
- payment keys are retained for at least 72 hours
- each record stores an `expires_at` timestamp
- a scheduled cleanup job purges expired records by `expires_at`
- once a record has expired and been purged, the same key may be accepted again as a new action

### Concurrency Rule

If two identical requests arrive at the same time, the unique constraint is the final guardrail.

- the first insert wins
- the second request must load the stored record after the constraint conflict
- if the stored request hash matches, replay the stored response
- if the stored request hash differs, return `409 Conflict`

### Replay Response Example

```http
X-Idempotency-Status: replayed
```

```json
{
  "order_id": "6c52a4ad-54b3-4fef-b7f5-7566e47bd0e8",
  "status": "submitted",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "reserved_amount": "65.00",
  "cost": "65.00",
  "available_balance": "35.00",
  "reserved_balance": "65.00"
}
```

## 2. Account Access And Wallet Verification Contract

These contracts describe the lightweight account and wallet-readiness flow that is already live in the repo. It is intentionally narrower than the eventual full JWT, KYC, and recovery model.

### Onboard Endpoint

`POST /api/v1/auth/onboard`

### Onboard Request Body

```json
{
  "firstName": "Bryan",
  "phone": "0796851024"
}
```

### Onboard Response

```json
{
  "sessionToken": "session-token-from-api",
  "account": {
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "firstName": "Bryan",
      "phone": "+254796851024",
      "mpesaPhone": null,
      "mpesaVerified": false
    },
    "wallet": {
      "currency": "KES",
      "availableBalanceKes": "0.00",
      "reservedBalanceKes": "0.00"
    }
  }
}
```

### Onboard Rules

- the API normalizes the submitted phone number to canonical Kenya format before storage
- first-time onboarding creates a `user`, `wallet`, and `session`
- repeat onboarding for the same phone reuses the existing `user` and `wallet`, updates the first name, and issues a new session token
- the returned session token is for trusted server-side handling, not for long-term storage in browser JavaScript

### Current Account Endpoint

`GET /api/v1/me`

### Current Account Rules

- the request uses `Authorization: Bearer <sessionToken>`
- the response returns the current account snapshot only
- expired or revoked sessions return `401 Unauthorized`

### M-Pesa Verification Endpoint

`POST /api/v1/wallet/verify-mpesa`

### M-Pesa Verification Request Body

```json
{
  "phone": "0796851024"
}
```

### M-Pesa Verification Response

```json
{
  "status": "verified",
  "verificationCreditKes": "5.00",
  "account": {
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "firstName": "Bryan",
      "phone": "+254796851024",
      "mpesaPhone": "+254796851024",
      "mpesaVerified": true
    },
    "wallet": {
      "currency": "KES",
      "availableBalanceKes": "5.00",
      "reservedBalanceKes": "0.00"
    }
  }
}
```

### M-Pesa Verification Rules

- the request requires an authenticated session
- the first successful verification credits `KES 5.00` to the wallet and appends a ledger entry
- repeat verification attempts for an already verified account return `status = "already_verified"` and do not double-credit the wallet
- the verified M-Pesa phone becomes part of the user account snapshot

### KYC Submission Endpoint

`POST /api/v1/kyc/submit`

### KYC Submission Rules

- the request requires an authenticated session
- the current lightweight KYC shape collects legal name, national ID number, date of birth, and a document reference
- submission creates or refreshes one `kyc_profile` row per user
- submission moves the account `kycStatus` to `pending`
- the wallet sheet can keep trading and wallet setup visible while KYC is pending unless stricter gating is enabled

### KYC Review Endpoints

- `GET /api/v1/admin/kyc/profiles?status=pending`
- `POST /api/v1/admin/kyc/profiles/{user_id}/review`

### KYC Review Rules

- admin review access is currently controlled by the configured phone allowlist
- approval moves both the profile and account `kycStatus` to `approved`
- rejection moves both the profile and account `kycStatus` to `rejected`
- rejected reviews must include a reason
- order placement only enforces `approved` KYC when `REQUIRE_APPROVED_KYC_FOR_ORDERS=true`
- the current web admin surface proxies these endpoints through same-origin routes at `/api/account/admin/kyc` and `/api/account/admin/kyc/{user_id}/review`
- the current product review page for this flow is `/admin/kyc`

### Admin Wallet Support Endpoint

`GET /api/v1/admin/wallet/activity`

### Admin Wallet Support Query Params

- `status`: optional, one of `pending`, `review_required`, `failed`, `completed`, or `all`
- `kind`: optional, one of `deposit`, `withdrawal`, or `all`
- `limit`: optional, capped at `50`

### Admin Wallet Support Rules

- admin support access is controlled by the same configured phone allowlist as KYC review
- the queue includes recent deposit and withdrawal activity with user name, phone, status, amount, and support-facing subtitle text
- `review_required` is especially important for withdrawal support since those funds remain reserved until manual review or payout completion
- the current web admin surface proxies this endpoint through the same-origin route `/api/account/admin/support`
- the current product review page for this flow is `/admin/support`

### M-Pesa Wallet Top-Up Endpoint

`POST /api/v1/wallet/deposit`

### M-Pesa Wallet Top-Up Request Body

```json
{
  "amountKes": "500.00"
}
```

### M-Pesa Wallet Top-Up Response

```json
{
  "status": "pending",
  "depositReference": "mpesa-topup-123",
  "requestedAmountKes": "500.00",
  "checkoutRequestId": "ws_CO_123456789",
  "customerMessage": "Success. Request accepted for processing.",
  "account": {
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "firstName": "Bryan",
      "phone": "+254796851024",
      "mpesaPhone": "+254796851024",
      "mpesaVerified": true
    },
    "wallet": {
      "currency": "KES",
      "availableBalanceKes": "505.00",
      "reservedBalanceKes": "0.00"
    }
  }
}
```

### M-Pesa Wallet Top-Up Rules

- the request requires an authenticated session
- the wallet must already be M-Pesa verified
- the API creates a `deposit` record in `pending` state before any callback-driven wallet credit
- the response returns a refreshed account snapshot so the web app can keep the same wallet sheet shape while the deposit is still pending
- in `stub` mode, the repo auto-completes the STK callback for local development
- in `sandbox` mode, the API initiates a real Daraja STK push and waits for the Safaricom callback before crediting the wallet and ledger

### M-Pesa Wallet Top-Up Status Endpoint

`GET /api/v1/wallet/deposit/{depositReference}`

### M-Pesa Wallet Top-Up Status Response

```json
{
  "status": "completed",
  "depositReference": "mpesa-topup-123",
  "requestedAmountKes": "500.00",
  "creditedAmountKes": "500.00",
  "account": {
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "firstName": "Bryan",
      "phone": "+254796851024",
      "mpesaPhone": "+254796851024",
      "mpesaVerified": true
    },
    "wallet": {
      "currency": "KES",
      "availableBalanceKes": "505.00",
      "reservedBalanceKes": "0.00"
    }
  }
}
```

### Daraja Callback Endpoint

`POST /api/v1/wallet/deposit/callback?token=<callback-token>`

### Daraja Callback Rules

- the callback token must match `DARAJA_CALLBACK_TOKEN`
- if `DARAJA_CALLBACK_ALLOWED_IPS` is configured, the resolved source IP must be on that allowlist
- `X-Forwarded-For` is only trusted when the immediate client IP is in `DARAJA_CALLBACK_TRUSTED_PROXY_IPS`
- if `DARAJA_CALLBACK_SIGNATURE_SECRET` is configured, the request must include `X-SokoOdds-Callback-Signature: sha256=<hmac>` computed from the raw JSON body
- successful callbacks mark the deposit `completed`, credit the wallet once, and append one `MPESA_DEPOSIT` ledger entry
- repeated callbacks for the same checkout request are safe to replay and must not double-credit the wallet
- failed callbacks mark the deposit `failed` and leave wallet balances unchanged

### M-Pesa Withdrawal Endpoint

`POST /api/v1/wallet/withdraw`

### M-Pesa Withdrawal Rules

- the request requires an authenticated session and a verified M-Pesa wallet
- the requested amount moves from `available balance` into `reserved funds` immediately
- withdrawals above `WITHDRAWAL_REVIEW_THRESHOLD_KES` enter `review_required`
- total daily requested withdrawals above `WITHDRAWAL_DAILY_LIMIT_KES` are rejected
- low-value withdrawals initiate Daraja B2C immediately

### M-Pesa Withdrawal Status Endpoint

`GET /api/v1/wallet/withdraw/{withdrawalReference}`

### M-Pesa Withdrawal Callback Endpoint

`POST /api/v1/wallet/withdraw/callback?token=<callback-token>`

### M-Pesa Withdrawal Callback Rules

- callback ingress uses the same token, allowlist, trusted-proxy, and optional signature checks as deposit callbacks
- successful callbacks release the held withdrawal funds from `reserved` and finalize the payout
- failed callbacks release the held amount back to `available balance`
- repeated callbacks for the same conversation are safe to replay and must not double-release funds

### Wallet Activity Endpoint

`GET /api/v1/wallet/transactions`

### Wallet Activity Rules

- the request requires an authenticated session
- the response returns a refreshed account snapshot together with the latest wallet activity rows
- the initial activity feed includes verification credits, M-Pesa top-ups, and M-Pesa withdrawals
- withdrawal rows stay visible across `pending`, `review_required`, `completed`, and `failed` states so payout holds and released failures are visible to the user
- the current wallet sheet refreshes this feed after verification, deposit initiation, and withdrawal initiation

### Session Revocation Endpoint

`DELETE /api/v1/auth/session`

### Session Revocation Rules

- the request uses `Authorization: Bearer <sessionToken>`
- revocation is safe to repeat
- successful revocation returns `204 No Content`

## 3. Web App Session Bridge Contract

The Next.js app uses same-origin route handlers as a thin bridge in front of the API. This keeps the API session token in an HTTP-only cookie instead of exposing it to client-side JavaScript.

### Web Bridge Endpoints

- `POST /api/account/session`
- `DELETE /api/account/session`
- `GET /api/account/me`
- `POST /api/account/verify-mpesa`
- `POST /api/account/kyc`
- `POST /api/account/deposit`
- `GET /api/account/transactions`
- `POST /api/orders`

### Web Bridge Rules

- the session cookie name is `sokoodds_session`
- the cookie is `HttpOnly`, `SameSite=Lax`, and only marked `Secure` when the request itself is HTTPS
- browser components call the same-origin web routes, not the API directly
- `POST /api/orders` forwards the session token as bearer auth and forwards an `Idempotency-Key`
- if the browser does not provide an `Idempotency-Key`, the web route generates one before forwarding the request upstream
- `GET /api/account/me` returns `401` and clears the stale cookie if the upstream session is expired or revoked

## 4. Market Resolution Evidence Contract

### Resolution Submission Endpoint

`POST /api/v1/admin/markets/{market_id}/resolve`

### Request Body

```json
{
  "outcome": "YES",
  "resolution_source_url": "https://www.iebc.or.ke/example-result",
  "resolution_notes": "Resolved using the official published county tally.",
  "evidence_attachments": [
    "https://storage.sokoodds.example/resolution/market-123/result.pdf"
  ]
}
```

### Field Rules

- `outcome` is required
- `resolution_source_url` is required
- `resolution_notes` is required
- `evidence_attachments` is optional
- `evidence_attachments` accepts at most 5 items
- attachment URLs must reference first-party platform storage, not arbitrary third-party URLs
- actor identity and request metadata must be written to audit logs

### Resolution Request Lifecycle

Each resolution submission creates a durable `resolution_request_id` in `market_resolution_requests`.

- standard flow: `approved -> settling -> resolved`
- high-risk flow: `pending_second_approval -> approved -> settling -> resolved`
- rejected flow: `pending_second_approval -> rejected`

### Approval Endpoints

- `GET /api/v1/admin/resolution-requests?status=pending_second_approval`
- `POST /api/v1/admin/resolution-requests/{resolution_request_id}/approve`
- `POST /api/v1/admin/resolution-requests/{resolution_request_id}/reject`

### Approval Rules

- the approving admin must be different from the initiating admin
- rejecting a request must capture a rejection reason in audit logs
- low-risk resolutions may skip `pending_second_approval` and transition directly to `approved`

### Market Behavior During Resolution

- initiating resolution sets `market.status = "pending_resolution"`
- no new orders are accepted while a market is `pending_resolution`
- matching is paused while a market is `pending_resolution`
- open orders are frozen and may not continue matching during the approval window
- before settlement begins, remaining open orders must be cancelled and reserved balances released atomically
- if a pending request is rejected, the market returns to an explicitly tradable state such as `open` or `paused`

## 5. WebSocket Envelope Contract

### Client -> Server Subscription Messages

```json
{
  "action": "subscribe",
  "channels": [
    "market:123:ticker",
    "market:123:orderbook",
    "market:123:trades"
  ]
}
```

```json
{
  "action": "unsubscribe",
  "channels": [
    "market:123:orderbook"
  ]
}
```

### Server -> Client Subscription Acknowledgement

```json
{
  "type": "subscribed",
  "channels": [
    "market:123:ticker",
    "market:123:orderbook",
    "market:123:trades"
  ]
}
```

### Outbound Envelope

Every outbound WebSocket message should follow this shape:

```json
{
  "channel": "market:123:orderbook",
  "sequence": 1842,
  "type": "book_update",
  "engine_emitted_at": "2026-03-19T19:00:00.001Z",
  "sent_at": "2026-03-19T19:00:00.009Z",
  "data": {}
}
```

### Canonical Channels

- `market:{id}:ticker` for `price_update` and terminal market state such as `resolution`
- `market:{id}:orderbook` for `book_update`
- `market:{id}:trades` for `trade`
- `market:{id}:snapshot` for `market_snapshot`
- `user:{id}:portfolio` for `position_update` and payout or wallet updates that affect the portfolio view
- `user:{id}:notifications` for user-facing notifications

### Sequence and Snapshot Rules

- `sequence` must be monotonic for each subscribed stream
- engine-originated market messages use a Rust-engine-owned sequence for that market stream
- user-scoped channels maintain their own monotonic sequence stream
- `engine_emitted_at` is required on engine-originated market messages
- `sent_at` is the timestamp when the WebSocket gateway sends the message to the client
- the server sends `market_snapshot` immediately after a successful market subscription
- the snapshot sequence establishes the trusted baseline for subsequent incremental updates
- clients discard any buffered messages with `sequence <= snapshot.sequence`
- clients discard messages where `sequence <= last_accepted_sequence`
- sequence gaps trigger an HTTP snapshot refetch or a resubscribe flow

## 6. WebSocket Market Event Shapes

### Snapshot

```json
{
  "channel": "market:123:snapshot",
  "sequence": 2000,
  "type": "market_snapshot",
  "engine_emitted_at": "2026-03-19T19:00:00.001Z",
  "sent_at": "2026-03-19T19:00:00.009Z",
  "data": {
    "market_id": "123",
    "yes_price": 0.63,
    "no_price": 0.37,
    "volume": 152340.0,
    "orderbook": {
      "yes_bids": [],
      "yes_asks": []
    }
  }
}
```

### Price Update

```json
{
  "channel": "market:123:ticker",
  "sequence": 2001,
  "type": "price_update",
  "engine_emitted_at": "2026-03-19T19:00:01.001Z",
  "sent_at": "2026-03-19T19:00:01.009Z",
  "data": {
    "yes_price": 0.64,
    "no_price": 0.36,
    "volume": 152980.0
  }
}
```

### Trade Update

```json
{
  "channel": "market:123:trades",
  "sequence": 2002,
  "type": "trade",
  "engine_emitted_at": "2026-03-19T19:00:02.001Z",
  "sent_at": "2026-03-19T19:00:02.009Z",
  "data": {
    "trade_id": "8e7ce58a-99e1-4e86-8fdb-3f75f06a6df9",
    "side": "YES",
    "price": 0.64,
    "quantity": 50.0
  }
}
```

### Resolution Update

```json
{
  "channel": "market:123:ticker",
  "sequence": 2050,
  "type": "resolution",
  "engine_emitted_at": "2026-03-19T20:00:00.001Z",
  "sent_at": "2026-03-19T20:00:00.009Z",
  "data": {
    "outcome": "YES",
    "resolved_at": "2026-03-19T20:00:00Z"
  }
}
```

## 7. Order Intake Contract

### Create Order Endpoint

`POST /api/v1/orders`

### Request Body

```json
{
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "side": "YES",
  "direction": "BUY",
  "price": "0.6500",
  "quantity": "100.00"
}
```

### Validation Rules

- `price` is a decimal string
- `price` allows at most 4 decimal places
- `price` must be between `0.0100` and `0.9900`
- `quantity` is a decimal string
- `quantity` allows at most 2 decimal places
- `quantity` must be at least `1.00`
- authenticated users must complete M-Pesa verification before the API accepts a live order
- validation errors return `422 Unprocessable Entity` with field-level errors

### Success Response

```json
{
  "order_id": "6c52a4ad-54b3-4fef-b7f5-7566e47bd0e8",
  "status": "submitted",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "reserved_amount": "65.00",
  "cost": "65.00",
  "available_balance": "35.00",
  "reserved_balance": "65.00"
}
```

### Cancellation Endpoint

`DELETE /api/v1/orders/{order_id}`

### Cancellation Rules

- only the owning user may request cancellation
- cancelable statuses are `submitted`, `accepted`, `queued_for_matching`, and `partially_filled`
- `filled`, `cancelled`, and `rejected` orders may not be cancelled
- cancellation requests flow through the same engine pipeline as order creation
- the API returns `202 Accepted` when the cancellation request is accepted for processing
- reserved balances are released only after the engine result `order.cancelled` is durably persisted
- state-conflicting cancellation attempts return `409 Conflict`

### Cancellation Response

```json
{
  "order_id": "6c52a4ad-54b3-4fef-b7f5-7566e47bd0e8",
  "status": "cancellation_requested",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "requested_at": "2026-03-19T19:05:00Z"
}
```

## 8. Worker Result Contract

### `trade.executed`

```json
{
  "trade_id": "8e7ce58a-99e1-4e86-8fdb-3f75f06a6df9",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "buyer_id": "11111111-1111-1111-1111-111111111111",
  "seller_id": "22222222-2222-2222-2222-222222222222",
  "side": "YES",
  "price": "0.6500",
  "quantity": "50.00",
  "engine_sequence": 491,
  "executed_at": "2026-03-19T19:00:02Z"
}
```

### `order.cancelled`

```json
{
  "order_id": "6c52a4ad-54b3-4fef-b7f5-7566e47bd0e8",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "user_id": "11111111-1111-1111-1111-111111111111",
  "released_amount": "65.00",
  "engine_sequence": 492,
  "cancelled_at": "2026-03-19T19:05:01Z"
}
```

### Consumer Rules

- engine-result consumers must be idempotent
- deduplication must use an event identifier or a scoped key such as `(market_id, engine_sequence)`
- `engine_sequence` alone must not be treated as globally unique across markets
- processed event ids or sequence checkpoints must be persisted durably for replay safety
- wallet, position, order, and ledger finalization must happen in one durable transaction

## 9. Engine Command Contracts

These contracts define the durable commands FastAPI publishes for the Rust engine to consume.

### `order.cancel_requested`

```json
{
  "order_id": "6c52a4ad-54b3-4fef-b7f5-7566e47bd0e8",
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "user_id": "11111111-1111-1111-1111-111111111111",
  "requested_at": "2026-03-19T19:05:00Z",
  "reason": "user_requested"
}
```

### `market.paused`

```json
{
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "initiated_by": "33333333-3333-3333-3333-333333333333",
  "at": "2026-03-19T19:10:00Z",
  "reason": "admin_pause"
}
```

### `market.resumed`

```json
{
  "market_id": "d0a3d2f5-5c2a-4bf4-bf54-c4778c62c8c0",
  "initiated_by": "33333333-3333-3333-3333-333333333333",
  "at": "2026-03-19T19:20:00Z",
  "reason": "admin_resume"
}
```

### Command Rules

- commands must be published through the durable outbox and stream pipeline
- command consumers must be idempotent
- the engine must stop accepting new matches for paused markets
- the engine must resume matching only after a `market.resumed` command is applied
- downstream workers must persist the resulting order, market, ledger, and notification changes durably
