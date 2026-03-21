# SokoOdds Homepage and Market Page UI Spec

## Purpose

This spec turns the benchmark research and the platform contracts into a build-ready frontend blueprint for the first high-value user-facing pages:

- homepage
- markets discovery page
- single market page

It is designed for a Kenya-first, mobile-first product that feels:

- more trustworthy than 5050
- more premium than Spreadhit
- more Kenya-specific than Bayse
- cleaner and easier to understand than Predicta

This document should stay aligned with:

- `docs/core-api-contracts.md`
- `docs/sprint-backlog.md`
- `docs/kenya-polymarket-implementation-guide.md`

## Current Repo Status

As of March 20, 2026, the repo has moved beyond a static scaffold on the highest-value onboarding path.

Already live in the checked-in app:

- homepage, markets page, and market detail page load with API-backed market data
- homepage now opens directly on a live `All markets` feed with no oversized marketing hero
- header uses a compact search-plus-category-rail pattern so users can scan bets immediately
- homepage header search and top nav now drive the same in-place board state instead of acting like static chrome
- header copy now reflects the active discovery state so focused boards feel connected to the top surface instead of looking like a detached grid
- search placeholder and empty-state copy now adapt to the active board, so `Economy` and `Ending soon economy` feel like real contexts rather than generic filters
- board title, count, and market grid now transition softly during discovery changes instead of snapping abruptly
- market cards use a calmer ivory modular surface with thin borders, soft shadows, and dense YES/NO actions
- the seed catalogue now carries a fuller launch board so the first scroll feels alive without inventing off-brand novelty markets
- a thin market-signals strip now surfaces `Trending now` and `Ending soon` above the grid without turning the page back into a hero
- signal-strip labels and micro-links now focus the homepage board in place instead of kicking users out of discovery
- active signal-strip shortcuts now stay visible so focused boards such as `Trending politics` and `Ending soon economy` still feel anchored to the landing page
- homepage discovery now updates the URL as the board changes, so a focused landing-page view can be copied and reopened without losing the in-place feel
- the `/markets` page now inherits the same signal-strip language in a flatter catalog treatment, so discovery stays consistent without making the catalog feel promotional
- `/markets` discovery interactions now sync back into the URL, so category and focus views survive reloads and can be shared directly
- category chips now filter the board in place instead of forcing a route change
- a slim `Ending soon` rail adds urgency without reintroducing clutter
- first market-detail visit shows a dismissible WhatsApp prompt
- the trading CTA opens a lightweight account setup sheet
- account creation is backed by the API through a same-origin Next.js route
- M-Pesa verification credits `KES 5.00` once and returns the user to the order ticket as `wallet ready`
- verified wallets can trigger a quick `KES 500` M-Pesa top-up from the same setup surface without leaving the market
- the first sample order submits against the live API and updates available versus reserved balance in the UI

Still intentionally not live in this pass:

- real Daraja STK push integration
- full KYC workflow
- live WebSocket order book updates
- withdrawals and full Daraja-backed payment settlement beyond the current demo top-up flow

## Benchmark Synthesis

### Copy Now

- Polymarket-style scan-first market feed and category rail
- Stripe-style information hierarchy and form clarity
- Kalshi and Bayse-style trust posture and contract seriousness
- 5050-style KES payout framing and M-Pesa visibility
- Predicta-style explicit balance states and user guidance
- Claude-style calm ivory card finish, rounded modular panels, and low-noise spacing

### Localize for Kenya and East Africa

- default to KES and East Africa time
- foreground mobile money and low-friction onboarding
- use Kenya-first categories before broadening regionally
- keep the launch catalogue dense with real local categories before adding broad global sprawl
- use trusted local resolution sources on every market
- keep wording plain and legible for non-traders

### Avoid

- crypto-native jargon
- crowded exchange screens on first load
- novelty-heavy launch categories that weaken trust
- vague resolution rules
- hidden financial state such as reserved balance or pending withdrawals

## Shared UX Vocabulary

Use the same user-facing language across homepage, market page, wallet surfaces, and onboarding.

### Market Status Language

Use these visible states consistently:

- `open`
- `ending soon`
- `paused`
- `pending resolution`
- `resolved`

### Wallet and Order Language

Use these phrases in functional UI:

- `available balance`
- `reserved funds`
- `order submitted`
- `waiting to match`
- `partially filled`
- `cancellation requested`

Avoid leaking backend or engine terminology into UI copy.

### Copy Register

Use different copy registers for different surfaces:

- homepage and marketing copy uses simple language such as `Buy YES`, `Buy NO`, and `Get paid when you're right`
- functional trading UI uses precise language such as `order submitted`, `reserved funds`, and `partial fill`
- status and error copy stays plain and specific, for example `Your order is waiting to match. You can cancel it from your portfolio.`

## Core UX Rules

### Rule 1: Probability Must Feel Concrete

Every price surface should show:

- YES probability
- NO probability
- what a user pays
- what they receive if correct

### Rule 2: Trust Must Sit Next to Action

Every market action area should keep these visible:

- market status
- close time
- resolution source
- short trust note

### Rule 3: Forms Must Explain the Next Step

Wallet and order forms should tell users:

- what happens after submit
- whether funds move to reserved balance
- expected confirmation timing
- what `pending`, `submitted`, `partially filled`, and `filled` mean

### Rule 4: Mobile Comes First

On mobile:

- primary action stays visible
- question and probability remain above the fold
- rules never feel buried
- cards stack cleanly without squeezing tables into unreadable widths

### Rule 5: First-Time Guidance Must Create Momentum

The first market view should not feel empty or risky.

Add first-use guidance that:

- introduces a WhatsApp updates channel for pauses, settlement notices, and market drops
- appears on first market-detail visit, not on every page load
- can be dismissed permanently
- stays consistent with the trust-first tone of the product

### Rule 6: First Funding Must Feel Native To Kenya

The first wallet setup should be designed around M-Pesa habits, not generic `add card` flows.

The desired first-time behavior is:

- create lightweight account profile first
- ask for one M-Pesa number
- use a very small KES verification payment
- explain clearly that the verification amount is credited back to the wallet
- describe why this step improves payout safety

The wallet should feel like a payout setup flow first and a deposit form second.

## Homepage Blueprint

### Primary Goal

Help a first-time user understand:

1. what SokoOdds is
2. why it is trustworthy
3. what markets are active now
4. how to start with minimal friction

Homepage priority note:

- the first viewport should lead with live discovery cards, not an oversized marketing hero
- product explanation should support the market grid, not delay it
- a user opening the site should be able to scan active bets immediately

### Section Order

#### 1. Header

Must include:

- SokoOdds wordmark
- navigation for Markets, How It Works, Trust, Wallet
- primary CTA

Behavior:

- sticky on desktop and mobile
- collapses into compact layout on narrow screens

#### 2. Discovery-First Feed

The homepage should behave more like a market board than a brochure.

Must include:

- a thin `Trending now / Ending soon` signal strip above the grid
- signal strip labels and micro-links that focus the board in place without adding a second heavy nav
- subtle active treatment on the currently selected signal board so users understand why the grid changed
- a more subdued catalog variant of the same strip on `/markets`, using tighter spacing and flatter surfaces
- URL updates on `/markets` when category, focus, or search changes so catalog boards feel bookmarkable and shareable
- compact `All markets` heading
- small discovery kicker, not a large hero paragraph
- visible live-contract count
- header microcopy that mirrors focused-board state such as `Viewing ending soon economy board`
- header search that filters the visible board in place
- search placeholder and no-results copy that mirror the current board scope instead of falling back to generic market language
- top nav chips that switch the board category in place
- dense category chips
- in-place category filtering
- four-column desktop feed when space allows
- a small `Show more markets` CTA below the grid
- a very slim urgency rail for closing contracts when relevant

Avoid:

- oversized brand storytelling above the first card row
- long trust strips before the user sees bets
- gradient-heavy hero blocks that push the cards below the fold

#### 3. Card Design Language

Cards should combine Polymarket-style scanability with calmer Claude-style presentation.

Each card should show:

- category
- market question
- YES and NO probability
- close time
- KES volume
- market status badge

Card feel:

- soft ivory surface
- large rounded corners
- thin double-border feeling
- gentle category-tinted wash, not loud gradients
- strong title, minimal supporting copy
- rectangular YES/NO action blocks that are readable at a glance

The first row should feel scannable in under five seconds.

#### 4. Trust Surfaces

Trust should move closer to the action, not live as a large homepage explainer.

Use:

- small trust note in the market detail header
- visible resolution-source reminder before trading
- wallet state surfaces inside the order ticket
- first-visit WhatsApp notice for settlement and pause alerts

Avoid:

- putting the trust story in a bulky homepage block before the cards
- separating wallet readiness from the trade ticket

#### 5. How It Works

Simple three-step path:

1. fund wallet
2. buy YES or NO
3. get paid when the market resolves

Copy note:

- keep this section simple and onboarding-friendly
- do not introduce `partial fill` or `reserved funds` language here
- those terms belong in the trading UI, not the homepage explainer

#### 6. Forecaster and Community Preview

Lightweight v1-ready placeholder:

- analyst leaderboard teaser
- `top thinkers this week`
- rationale or comments preview

This can be static in the first scaffold, but the layout should reserve space for it.

## Markets Page Blueprint

### Primary Goal

Let users browse many markets without losing clarity.

### Structure

- title and short description
- `FilterChipRow`
- search and quick utility actions where they help mobile users recover context quickly
- highlighted market row
- responsive discovery grid

### Filter Priorities

Start with:

- All
- Politics
- Football
- Economy
- Weather
- Culture

Avoid advanced filtering overload in v1.

## Single Market Page Blueprint

### Primary Goal

Help users understand the market, trust the rules, and place an order confidently.

### Desktop Layout

- left content column for question, chart, rules, book, trades, and resolution context
- right sticky column for order ticket, balance summary, and trust state

### Mobile Layout

Mobile must not simply stack the desktop page.

Required behavior:

- question, status, and YES or NO price stay at the top
- a sticky bottom `MobileTradeBar` stays visible while scrolling
- the bar shows selected YES or NO price and a primary `Buy` CTA
- tapping the CTA opens the full `OrderTicketSheet` as a bottom sheet
- the order book is collapsed by default on mobile
- the order book opens through a clear `Show order book` toggle
- the bottom bar stays available after the user scrolls through rules, chart, or recent trades

### Top Section

Must show:

- market category
- `MarketStatusBadge`
- full question
- short context sentence
- YES and NO probability
- close time
- KES volume
- resolution source preview

Should also support:

- a lightweight market-intel strip that promotes WhatsApp alerts or trust updates
- a first-visit community prompt that can be dismissed

### Market Status Presentation

Use one consistent component and color system for:

- `open`
- `ending soon`
- `paused`
- `pending resolution`
- `resolved`

Paused and pending-resolution states should suppress live trading CTAs and replace them with explanatory copy.

### Order Ticket

Must show:

- selected side
- price
- quantity
- estimated stake
- estimated payout
- `BalanceSummary` with available and reserved balances
- order readiness state
- short next-step explanation

Copy rules:

- say `available balance` and `reserved funds`
- say `order submitted` rather than internal engine terminology
- explain that fills may be partial
- explain that unfilled orders can be cancelled
- make it obvious when the next step is `create account`, `verify M-Pesa`, `top up wallet`, or `review submitted order`

### First-Time Account and Wallet Setup

Keep the component boundaries explicit:

1. `AccountSetupSheet` collects first name and one M-Pesa number
2. `VerificationSheet` handles the KES 5 verification flow
3. success state returns the user to the order ticket with `wallet ready`

The flow should feel like a fast local onboarding sheet, not a generic payments modal.

Implementation note:

- the current web app calls same-origin routes under `/api/account/*`
- those routes proxy to FastAPI and keep the session in an HTTP-only cookie
- the order ticket then submits through `/api/orders` so idempotency and account state stay server-mediated

### Verification Flow States

Happy path:

1. collect M-Pesa number
2. show KES 5 verification explanation
3. trigger STK push
4. show pending confirmation state
5. show success and explain the KES 5 has been credited back to wallet balance

Required error states:

- STK timeout: `The M-Pesa prompt expired before you completed it. Try again.`
- user cancelled prompt: `You cancelled the M-Pesa prompt. No money moved.`
- number cannot complete verification: `We could not verify this M-Pesa number. Check the number and try again.`
- insufficient M-Pesa balance: `Your M-Pesa balance was not enough for the KES 5 verification. Top up M-Pesa and try again.`
- provider delay: `We are still waiting for Safaricom confirmation. This can take a short while.`

Every error state must include:

- retry action
- change number action
- support or fallback guidance if repeated failures continue

### WhatsApp Prompt Persistence

Define dismissal persistence explicitly:

- anonymous users store dismissal in `localStorage`
- authenticated users store dismissal server-side on profile and mirror it locally for faster first paint
- if an anonymous user dismisses and later signs in on the same device, keep the local dismissal until the profile preference is known
- `dismiss permanently` means until the user clears browser data or changes the server-side preference

### Market Information Blocks

Must include:

- market summary
- rules and edge cases
- resolution source
- fairness note

### Realtime Blocks

Must include:

- `PriceChart`
- `OrderBook`
- `RecentTrades`
- `PositionSummaryCard`

Each block should support sequence-safe WebSocket updates later and align with the canonical channels in `docs/core-api-contracts.md`.

### Resolved Market State

Resolved markets need a dedicated visual treatment.

Use `SettledMarketBanner` to show:

- resolved outcome
- resolved timestamp
- payout or settlement status if relevant
- clear explanation that new orders are no longer accepted

## Component Inventory

Build these as reusable pieces:

- `SiteHeader`
- `SiteFooter`
- `HeroPulseBoard`
- `MarketCard`
- `MarketStatusBadge`
- `ProbabilityPill`
- `SectionHeading`
- `TrustCard`
- `FilterChipRow`
- `PriceChart`
- `OrderTicket`
- `OrderTicketSheet`
- `MobileTradeBar`
- `BalanceSummary`
- `OrderBook`
- `RecentTrades`
- `MarketRulesCard`
- `PositionSummaryCard`
- `SettledMarketBanner`
- `WhatsAppPrompt`
- `AccountSetupSheet`
- `VerificationSheet`
- `WalletStatusButton`

## Sprint Mapping

### Sprint 1

- header, footer, hero shell, trust strip

### Sprint 2

- homepage discovery sections
- markets page
- market detail information surfaces
- first-visit WhatsApp prompt on market detail
- first browser-review pass with Playwright screenshots or checks

### Sprint 3

- order ticket
- wallet states
- payout preview
- first-time account setup sheet
- KES 5 M-Pesa verification sheet and success state
- same-origin cookie-backed account session bridge
- first authenticated sample-order submission from the market page

### Sprint 4

- live order book
- live trades
- live position strip

### Sprint 5

No frontend deliverables. Backend Rust cutover sprint.

Frontend should remain stable on the Phase 4 WebSocket contract and sequence-safe UI behavior.

### Sprint 6

- M-Pesa funding and withdrawal UI

### Sprint 7

- resolution evidence display
- settled market banner
- pending-resolution and resolved market states

## Current Delivery Scope

The current checked-in build already delivers:

- a benchmark-aligned homepage
- a markets listing page
- an API-backed market detail page
- reusable components for trust surfaces, onboarding sheets, and order entry
- Kenya-first hero and trust-strip copy
- first-visit WhatsApp prompt persistence
- backend-backed account setup and M-Pesa verification state
- one live authenticated sample-order path from the order ticket

The next frontend layers still pending are:

- live WebSockets and sequence-aware market blocks
- real charting engine behavior
- full deposit and withdrawal UI
- full auth, KYC, and portfolio surfaces

## Browser Verification

For any meaningful frontend change, review the live page in a browser before calling it done.

Minimum browser checks:

- homepage renders at `1280px` with no console errors
- market detail page renders at `1280px` with live market data and visible trust surfaces
- first-visit WhatsApp prompt appears on first market-detail load
- dismissing the WhatsApp prompt prevents it from reappearing on second load
- unauthenticated order CTA opens `AccountSetupSheet`
- `VerificationSheet` renders the KES 5 explanation and the success state after verification
- verified users keep the wallet-ready state after reload
- first authenticated sample order updates the ticket success state and balance summary
- mobile viewport at `390px` shows the sticky trade CTA without scrolling
- mobile market page keeps the order ticket reachable after scrolling into rules and trades

Minimum Playwright evidence for this spec:

- homepage desktop render
- market-detail desktop render
- WhatsApp prompt first-visit behavior
- WhatsApp prompt dismissal persistence
- account setup sheet open from trading CTA
- verification success state and wallet persistence after reload
- first authenticated order moving funds from available balance into reserved funds
- mobile sticky trade bar visibility
