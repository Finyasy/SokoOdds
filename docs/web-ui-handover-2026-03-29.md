# Web UI Handover

Date: `2026-03-29`

## What Was Completed

- Reworked the web app toward a Polymarket-inspired, East Africa-facing discovery experience.
- Wired the exact SokoOdds brand artwork from `IMG_4649.jpg` into header, footer, menu avatar, and onboarding surfaces.
- Added a richer homepage and `/markets` discovery flow:
  - sliding trending hero
  - mixed board card families
  - stronger footer and support/legal pages
- Upgraded market detail:
  - comments, top holders, activity
  - collapsible order book
  - recent trades tape
  - tighter order ticket
  - mobile sticky trade shortcut
- Added durable account-personalization and execution plumbing:
  - server-backed feed interaction persistence
  - anonymous-to-signed-in feed signal sync
  - server-backed comment-thread follow and catch-up persistence
  - durable trades, positions, and engine result processing
  - portfolio-aware market detail and order-ticket state
- Added durable market community surfaces:
  - API-backed holders and comments on market detail
  - durable market comments with likes, hide, restore, and one-level replies
  - admin market-comment review queue in the web app
  - followed-thread rail plus signed-in thread-follow persistence
  - cross-market reply alerts in the `For you` feed for followed threads
  - inline reply hide and restore controls inside market-detail threads for admins
- Added local market identity media and chart-led hero artwork for high-visibility contracts.

## Key Files

- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/globals.css`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/lib/mock-data.ts`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/lib/market-api.ts`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/trending-hero-carousel.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/market-card.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/market-detail-experience.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/order-book.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/order-ticket.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/market/market-for-you-hub.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/onboarding/onboarding-provider.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/api/app/services/trade_results.py`
- `/Users/bryanbosire/projects/SokoOdds/apps/api/app/services/account_access.py`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/layout/site-header.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/layout/header-utility-menu.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/layout/site-footer.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/components/layout/sokoodds-logo.tsx`

## Brand And Media Assets

- Exact brand image:
  - `/Users/bryanbosire/projects/SokoOdds/apps/web/public/brand/IMG_4649.jpg`
- Market icon tiles:
  - `/Users/bryanbosire/projects/SokoOdds/apps/web/public/market-icons/`
- Hero artwork panels:
  - `/Users/bryanbosire/projects/SokoOdds/apps/web/public/market-art/`

## Product Surfaces Added

- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/help/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/docs/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/leaderboard/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/portfolio/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/cash/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/market-integrity/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/privacy/page.tsx`
- `/Users/bryanbosire/projects/SokoOdds/apps/web/app/terms/page.tsx`

## Intentional Mock Areas

- Some market context and secondary community details are still partially mock-driven in:
  - `/Users/bryanbosire/projects/SokoOdds/apps/web/lib/mock-data.ts`
- The dropdown and wallet flows use real app states, but deposit actions still open the onboarding flow rather than a full backend cash ledger journey.
- Discovery hero artwork is intentionally limited to the flagship trend contracts so the board does not get noisy.
- The order ticket still exposes `Sell` as a visual mode only. Live sell-side order handling is not wired end-to-end yet.

## Important Implementation Notes

- `market-api.ts` preserves local presentation identity when upstream API identity data is incomplete.
- The commodity hero contract was corrected to crude oil:
  - `Will crude oil hit $100 by April 30?`
- The app includes coordinated dark mode styling under `html[data-theme="dark"]`.
- The mobile market page now includes a sticky trade bar that anchors to `#trade-ticket`.
- Local web review should use `http://127.0.0.1:3000`, not `http://localhost:3000`, because the active Next dev server is now bound to `127.0.0.1` to avoid the host-specific hydration issues we hit during market-detail QA.
- Core header/account flows were verified on `2026-03-29` with Playwright against `127.0.0.1:3000`, including category nav, sign-up/login entry, market-detail onboarding, wallet verification, top-up, and portfolio/cash navigation.
- Signed-in funded-shell coverage now also checks the header cash/portfolio strip, the header deposit trigger, and utility-menu routes for docs, help, and leaderboard.
- Market detail and order-ticket surfaces were hardened against incomplete portfolio payloads so missing `positions` or `markets` arrays no longer crash the page during signed-in onboarding and funding flows.
- `/markets` personalization now renders from a server-safe baseline first, then applies local feed/streak state after hydration to avoid client/server text drift.
- Market detail and the order ticket now share the same portfolio-order snapshot via onboarding state, so new exposure can update both surfaces together after order submission.
- Comment-thread follows and catch-up state now persist server-side for signed-in users, while still keeping local-first responsiveness for follow, unfollow, and seen actions.

## Verification

1. `uv run ruff check apps/api apps/worker`
2. `uv run pyright`
3. `uv run pytest apps/api/tests apps/worker/tests`
4. `pnpm --dir apps/web build`
5. Browser check on `http://127.0.0.1:3000`:
   - `/`
   - `/markets`
   - one market detail route
   - `/cash`
   - `/help`
6. Re-run Playwright or screenshot QA for:
   - desktop `/markets`
   - desktop market detail
   - mobile market detail

## Recommended Next Steps

1. Wire true sell-side order handling into the ticket and portfolio surfaces so the `Sell` mode stops being presentation-only.
2. Add browser coverage for inline reply moderation on market detail in addition to the discovery-alert moderation flow.
3. Wire deposit, withdrawal, and cash history into a fuller wallet ledger surface rather than onboarding-only flows.
4. Replace the remaining mock-only related-market and market-context detail once backend detail endpoints are available.
