# SokoOdds
East Africa's Premier Prediction Market.

Predict smarter. Trade the moments that move East Africa.

## Documentation

- [Kenya Polymarket Implementation Guide](docs/kenya-polymarket-implementation-guide.md)
- [Implementation Concept Paper](docs/implementation-concept-paper.md)
- [Global Benchmark Ideas for Kenya & East Africa](docs/global-benchmark-ideas-for-kenya-east-africa.md)
- [Sprint Backlog](docs/sprint-backlog.md)
- [Core API Contracts](docs/core-api-contracts.md)
- [Homepage and Market Page UI Spec](docs/homepage-and-market-ui-spec.md)
- [Frozen Decisions Implementation Tickets](docs/frozen-decisions-implementation-tickets.md)
- [Decision Records](docs/decisions/README.md)
- [Runbooks](docs/runbooks/README.md)
- [Incident Template](docs/runbooks/incident-template.md)
- [Monitoring Reference](docs/runbooks/monitoring-reference.md)

## Local Stack

The checked-in local stack is defined in [infra/compose/compose.yaml](infra/compose/compose.yaml) and includes:

- `postgres`
- `redis`
- `migrate`
- `api`
- `worker`
- `market-engine`
- `web`

## Local Commands

- Copy [.env.example](/Users/bryanbosire/projects/SokoOdds/.env.example) to `.env`
- Start the full stack: `make up`
- Run migrations only: `make migrate`
- Check service health: `make health`
- Run the local smoke test: `make smoke`
- Run the browser onboarding checks: `pnpm test:e2e:web`
- Tail logs: `make logs`
- Stop the stack: `make down`

## Review The Current UI

- Open the live site at [http://127.0.0.1:3000](http://127.0.0.1:3000)
- The current high-value review path is:
  - open a market detail page
  - dismiss the first-visit WhatsApp prompt
  - create the lightweight account
  - verify the M-Pesa number with the `KES 5` credit flow
- trigger the `KES 500` M-Pesa top-up and confirm the wallet refreshes after the deposit completes
- trigger the `KES 200` withdrawal and confirm the wallet balance drops while the payout completes
- submit the lightweight KYC form from the wallet sheet and confirm it moves into `KYC pending`
- open [http://127.0.0.1:3000/cash](http://127.0.0.1:3000/cash) to review funding status, withdrawal readiness, and recent wallet ledger activity in a dedicated surface
- open [http://127.0.0.1:3000/portfolio](http://127.0.0.1:3000/portfolio) to review wallet cash, reserved funds, KYC status, recent money movement, and open-order exposure in one account surface
- switch to [http://127.0.0.1:3000/admin/kyc](http://127.0.0.1:3000/admin/kyc), sign in with an allowlisted admin number, and review the pending KYC applicant
- switch to [http://127.0.0.1:3000/admin/support](http://127.0.0.1:3000/admin/support) and inspect recent deposits and withdrawals from the admin support queue
- release or reject `review_required` withdrawals from the same admin support queue when manual payout review is needed
- confirm the wallet sheet now shows recent verification, top-up, and withdrawal activity inline
- place the sample order and confirm available versus reserved balance updates

The current Playwright coverage in `pnpm test:e2e:web` verifies:

- first-visit WhatsApp prompt behavior
- backend-backed account creation
- M-Pesa verification success and wallet persistence after reload
- M-Pesa top-up initiation plus wallet refresh after deposit completion
- M-Pesa withdrawal initiation plus wallet refresh after payout completion
- lightweight KYC submission from the wallet sheet
- admin KYC approval from the web review queue
- admin wallet support visibility for deposits and withdrawals
- admin approval and rejection actions for `review_required` withdrawals
- wallet activity visibility after funding and payout actions
- signed-out and signed-in portfolio/account overview states
- first live order submission from the order ticket
- header cash/portfolio consistency after funding
- signed-in header deposit trigger plus utility-menu routes for docs, help, and leaderboard
- market surfaces stay resilient when portfolio payload sections are missing or incomplete

The local scripts still default to `localhost` for API and engine probes, but the web app should now be reviewed on `127.0.0.1:3000` because that is the host the active Next dev server binds to. If another project is already bound to the same ports on `127.0.0.1`, keep `API_HOST=localhost` and `ENGINE_HOST=localhost` in `.env`, or move the ports in `.env` to avoid collisions.

The web app uses `SOKOODDS_API_SERVER_URL` for server-side fetches and `NEXT_PUBLIC_API_BASE_URL` for browser-side requests. In Docker Compose the internal server URL points at `http://api:8000/api/v1`.

For wallet funding, the API supports `DARAJA_MODE=stub` for local auto-completed callbacks and `DARAJA_MODE=sandbox` for real Safaricom sandbox STK push initiation. The checked-in [.env.example](/Users/bryanbosire/projects/SokoOdds/.env.example) is now sandbox-oriented, so switch it back to `stub` for local-only work if you do not have public callback routing yet.

For production-style callback hardening, set:
- `DARAJA_CALLBACK_ALLOWED_IPS` to the Safaricom callback source ranges you trust
- `DARAJA_CALLBACK_TRUSTED_PROXY_IPS` to only the ingress or reverse proxies allowed to forward `X-Forwarded-For`
- `DARAJA_CALLBACK_SIGNATURE_SECRET` if you place an internal relay or edge worker in front of the callback and want body-signature verification in addition to token and IP controls

For KYC rollout, the current repo now supports a lightweight KYC submission and admin-review path. Use:
- `ADMIN_PHONE_ALLOWLIST` for the phones allowed to access admin KYC review endpoints
- `REQUIRE_APPROVED_KYC_FOR_ORDERS=true` only when you want order placement to enforce approved KYC server-side
- the web review surface lives at [http://127.0.0.1:3000/admin/kyc](http://127.0.0.1:3000/admin/kyc) and uses the same `sokoodds_session` cookie-backed account flow as the market pages

For ops/support review, the current repo also includes [http://127.0.0.1:3000/admin/support](http://127.0.0.1:3000/admin/support), which reads recent deposit and withdrawal activity through the same allowlisted admin session.

For account-aware browser actions, the Next.js app uses same-origin route handlers under `/api/account/*` and `/api/orders`. Those handlers proxy to FastAPI and keep the session token in the `sokoodds_session` HTTP-only cookie.

For local Playwright runs on machines where the bundled browser is not installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a local Chrome or Chromium binary before running `pnpm test:e2e:web`.
