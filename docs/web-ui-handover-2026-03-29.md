# Web UI Handover

Date: `2026-03-29`

## What Was Completed

- Reworked the web app toward a Polymarket-inspired but Kenya-first discovery experience.
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

- Comments, holders, activity, and some market context are still mock-driven in:
  - `/Users/bryanbosire/projects/SokoOdds/apps/web/lib/mock-data.ts`
- The dropdown and wallet flows use real app states, but deposit actions still open the onboarding flow rather than a full backend cash ledger journey.
- Discovery hero artwork is intentionally limited to the flagship trend contracts so the board does not get noisy.

## Important Implementation Notes

- `market-api.ts` preserves local presentation identity when upstream API identity data is incomplete.
- The commodity hero contract was corrected to crude oil:
  - `Will crude oil hit $100 by April 30?`
- The app includes coordinated dark mode styling under `html[data-theme="dark"]`.
- The mobile market page now includes a sticky trade bar that anchors to `#trade-ticket`.

## Verification To Run After Node/ICU Is Fixed

1. `npm run typecheck`
2. `npm run lint` if available in the workspace
3. `npm run build`
4. Browser check:
   - `/`
   - `/markets`
   - one market detail route
   - `/cash`
   - `/help`
5. Re-run Playwright or screenshot QA for:
   - desktop `/markets`
   - desktop market detail
   - mobile market detail

## Recommended Next Steps

1. Replace more mock-only community data with API-backed market detail once backend endpoints exist.
2. Add richer real-image market art for selected flagship contracts if editorial assets become available.
3. Wire deposit, withdrawal, and cash history into a real wallet ledger surface rather than onboarding-only flows.
4. Add full QA once the local Node environment is healthy again.
