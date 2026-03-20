# Global Benchmark Ideas for Kenya & East Africa

## Purpose

This document distills the best product ideas from major prediction market and forecasting platforms, then adapts them for a Kenya-first and East Africa-relevant audience.

The goal is not to clone foreign platforms blindly. The goal is to borrow what works, localize what matters, and avoid patterns that do not fit East African trust, payments, regulation, language, bandwidth, or culture.

## Core Recommendation

The strongest SokoOdds blend is:

- Polymarket-like market UX
- Kalshi-like trust and contract discipline
- Manifold-like community loops
- Metaculus-like reputation and forecasting depth
- PredictIt-like clarity around wording, closures, and resolution handling

## Regional Competitor Synthesis

These are the most relevant Kenya- and Africa-adjacent product references to study as direct market competitors or near-neighbors.

### 5050 Markets

What stands out:

- Kenya-first positioning
- visible M-Pesa deposit flow on market pages
- clear KES payout framing such as "Pay KES X to win KES 100 if correct"
- public market proposals flow that rewards users for ideas
- local celebrity, politics, and public-event market coverage

What SokoOdds should learn:

- keep payments local and obvious
- let users influence supply through moderated market suggestions
- translate probability into KES payout instantly

Where SokoOdds should beat it:

- stronger trust copy on every market
- cleaner rule hierarchy and resolution evidence
- more premium market-page polish
- fewer ambiguous or novelty-heavy launch markets

### Spreadhit

What stands out:

- Kenya-first language and KES-denominated trading
- M-Pesa deposits and withdrawals called out directly
- low-friction onboarding
- community language around leaderboards, market suggestions, and forecasting skill

What SokoOdds should learn:

- onboarding should feel fast and mobile-native
- community and reputation should not wait until the very end of the roadmap
- simple “how it works” education matters for first-time users

Where SokoOdds should beat it:

- more exchange-grade market depth and order-state clarity
- stronger trust and audit surfaces
- more professional visual system for a money product

### Bayse

What stands out:

- strong Africa-native identity
- explicit prohibition and integrity policy
- repeated explanation that prediction markets are user-to-user and probability-based
- broader category coverage and a clearer policy posture than many local-looking products

What SokoOdds should learn:

- integrity policy should be visible, not hidden
- prohibited participants and conflict-of-interest rules should be explicit early
- local relevance can coexist with a serious finance-style voice

Where SokoOdds should beat it:

- deeper Kenya-first localization
- better browser-based mobile web experience
- stronger market detail pages and clearer payout math

### Predicta Markets

What stands out:

- detailed user documentation
- support for KES and TZS in addition to USD
- clear explanations of price equals probability
- visible account states such as available and suspense balances
- support for binary, multi-outcome, and series markets

What SokoOdds should learn:

- balance states should be explicit
- documentation should teach market mechanics clearly
- advanced market types belong in the long-term roadmap, not in v1

Where SokoOdds should beat it:

- tighter visual coherence
- simpler, more trustworthy first-time user experience
- sharper launch focus on binary markets and liquidity concentration

## Where SokoOdds Should Win

Across the regional benchmark set, the clearest opening is:

- more trustworthy than 5050
- more premium than Spreadhit
- more Kenya-specific than Bayse
- cleaner and more intuitive than Predicta

In practical terms, that means:

- trust and resolution evidence are product features, not policy footnotes
- wallet and M-Pesa flows are as polished as the market UI
- fewer markets at launch, but better liquidity and wording
- community is moderated and credibility-oriented, not noisy
- probability, payout, and order-state math are always obvious

## Stripe-Inspired UI and Product Rules

Stripe is not a prediction market, but it is one of the best benchmarks for calm, conversion-friendly, high-trust financial product UX.

### What to Borrow from Stripe

- modular page sections with strong visual hierarchy
- clear headline, proof, and action structure
- composable UI blocks instead of crowded screens
- excellent spacing and readability on dense information surfaces
- forms with built-in validation, masking, helper text, and low confusion
- strong trust posture through reliability, support, and implementation clarity
- progressive disclosure: simple first view, deeper controls when needed

### How SokoOdds Should Localize It

- combine Stripe’s calm structure with East African color energy and texture accents
- make mobile wallet actions feel simple, fast, and safe
- reduce cognitive load in funding, withdrawing, and order placement
- use crisp section headlines such as "How this market resolves", "Your risk", and "Available balance"
- show trust proof near action surfaces, not only in headers and footers

### Concrete UI Rules for SokoOdds

- every action form should explain what happens next
- every money screen should show status, amount, and timing clearly
- every market page should keep the question, rules, and current probability visible without scrolling through clutter
- every error state should be actionable and written in plain English
- every dense screen should separate primary action, explanatory copy, and supporting data visually

## Progressive Implementation Synthesis

Use the benchmark set in phases instead of trying to copy everything at once.

### Sprint 0 to Sprint 1

Borrow from:

- Stripe for layout discipline and trust-first page structure
- Bayse and Kalshi for integrity and policy posture

Implement:

- clear brand positioning
- trust pages and policy structure
- visual system tokens
- benchmark capture workflow

### Sprint 2

Borrow from:

- Polymarket for discovery and market-card hierarchy
- 5050 and Spreadhit for local category and payment relevance

Implement:

- trending, active, and ending-soon homepage sections
- market cards that show probability, volume, close time, and category clearly
- Kenya-first categories with plain-language rules previews

### Sprint 3

Borrow from:

- Stripe for form clarity and validation
- Predicta for available versus reserved balance language

Implement:

- order ticket with payout preview and fee transparency
- wallet ledger page with status tags
- M-Pesa-first deposit and withdrawal UX

### Sprint 4 to Sprint 5

Borrow from:

- Polymarket for live trading surfaces
- PredictIt for high-volume state messaging

Implement:

- realtime order book and trade feed
- “submitted”, “processing”, “partially filled”, and “filled” states
- volatility-mode notices for paused or delayed markets

### Sprint 6 to Sprint 7

Borrow from:

- Stripe for payment-state communication
- Kalshi and Bayse for integrity and fairness framing

Implement:

- deposit and withdrawal timelines
- resolution evidence surfaces
- public trust language around monitoring, conflicts, and disputes

### Sprint 8 and Beyond

Borrow from:

- Spreadhit and Manifold for community loops
- Metaculus for reputation and tournaments
- 5050 for supply-side market proposal incentives

Implement:

- comments and analyst reasoning
- leaderboard and accuracy profiles
- moderated market suggestions
- later tournament or seasonal leaderboard systems

## Benchmarking Workflow for Each Major Sprint

Before implementing any major user-facing flow:

1. review at least two relevant benchmarks
2. capture screenshots or notes using browser tooling and, when practical, Playwright-driven audits
3. write a short "copy / localize / avoid" note for the feature
4. map the note into concrete UI and acceptance criteria before coding starts

Recommended benchmark pairings:

- homepage and discovery: Polymarket + Stripe
- wallet and payments: Stripe + Spreadhit or 5050
- market rules and resolution: Kalshi + PredictIt + Bayse
- community and profiles: Spreadhit + Manifold + Metaculus
- advanced product roadmap: Predicta + Kalshi

The benchmark process should be continuous. It is a design input, not a one-time research task.

## Product Model Comparison

### Polymarket

Closest to a consumer trading product built around event probabilities and Yes/No contracts.

Why it matters for SokoOdds:

- best reference for consumer market UX
- best reference for “probability as product”
- best reference for broad, repeat-visit market browsing

### Kalshi

Closest to a serious event-contract model with strong trust and integrity framing.

Why it matters for SokoOdds:

- best reference for trust language
- best reference for disciplined contract framing
- best reference for integrity, surveillance, and market-governance posture

### Manifold

Closer to a community-led, social prediction platform than a classic exchange.

Why it matters for SokoOdds:

- best reference for social participation loops
- best reference for lowering contribution friction
- best reference for future creator and comment ecosystems

### Metaculus

Not a primary trading product. It is a forecasting and aggregation platform focused on scores, tournaments, and forecasting quality.

Why it matters for SokoOdds:

- best reference for forecaster reputation
- best reference for leaderboards and tournaments
- best reference for a long-term “forecast identity” layer

### PredictIt

Closer to a contract/share market with especially strong political-market wording and settlement discipline.

Why it matters for SokoOdds:

- best reference for precise market wording
- best reference for closure notices and integrity messaging during spikes
- best reference for settlement clarity on public-event markets

## Benchmark Platforms

## 1. Polymarket

### What it does well

- makes probability the main product
- presents markets as clean, high-signal cards
- uses binary Yes/No framing clearly
- groups related questions into events and markets
- shows order-book mechanics and probabilities in a trading-native way
- emphasizes explicit resolution rules and sources

### Official signals worth studying

- Polymarket docs describe markets as binary Yes/No units grouped into broader events
- prices are shown as probabilities between 0 and 1
- the displayed price is tied to the bid/ask spread or last price
- orders follow a clear lifecycle and can be GTC, GTD, FOK, or FAK
- resolution rules explicitly define source, end date, and edge cases

### Best ideas to borrow

- probability-first market cards
- simple Yes/No trade entry
- grouped event pages
- clear order-book depth
- market detail pages with rules front and center
- “always read the rules before trading” mentality

### Kenya / East Africa localization

- show KES volume and KES payout language, not crypto-first language
- use categories like Kenya Politics, East Africa Business, Football, Weather, Agriculture, FX, Telecoms, Entertainment
- make rules boxes highly visible and written in plain English, with room for Swahili support later
- localize resolution sources to institutions users trust, such as IEBC, CBK, KNBS, KNEC, Kenya Meteorological Department, CAF, FKF, NSE, Safaricom, or official league and government sources

### What to avoid copying directly

- crypto-wallet-first onboarding
- developer-centric product language in the consumer UI
- heavy dependence on onchain vocabulary for mainstream users

## 2. Kalshi

### What it does well

- frames prediction markets as serious event contracts
- leads with trust, regulation, and integrity
- keeps the core interaction simple: Yes or No
- organizes markets across finance, politics, sports, culture, and real-world events
- explores advanced structures like combo products

### Official signals worth studying

- Kalshi describes event contracts as a new asset class
- it emphasizes transparency, integrity, security, and trust under regulation
- it positions the product as accessible to ordinary users, not just institutions
- its combos feature shows how multi-event products can later sit on dedicated order books with special pricing logic

### Best ideas to borrow

- “trade on real-world events” brand framing
- compliance-forward trust language
- highly structured contract templates
- serious category architecture
- eventual combo builder for sports or multi-event bundles

### Kenya / East Africa localization

- adapt the “event contracts” framing into locally understandable language like “event markets” or “future outcome contracts” depending on legal advice
- create trust pages for market integrity, payouts, data sources, and user protections
- build stronger institutional-feeling categories for inflation, FX, interest rates, fuel prices, rainfall, agriculture, and elections
- use trust badges for KYC verified, resolution source verified, and market monitored

### What to avoid copying directly

- US-regulation-first messaging that does not map to Kenya
- over-financialized copy that intimidates first-time users
- advanced products like combos before the core binary market is stable

## 3. PredictIt

### What it does well

- keeps political market wording disciplined
- repeatedly emphasizes market rules for closing and settlement
- communicates clearly during heavy trading periods
- acknowledges that high-volume events require special integrity controls

### Official signals worth studying

- PredictIt communications emphasize that orders are processed in received order
- users are told not to resubmit offers already in process
- the platform may suspend trading early to preserve integrity under heavy load
- settlement timing follows market-specific rules when outcomes are disputed
- market suggestions are expected to include legitimate resolution sources

### Best ideas to borrow

- stronger wording discipline for political and public-event markets
- explicit market closure and resolution policy
- high-volume event notices and surge-mode UX
- clear “order submitted / still processing” states during volatility

### Kenya / East Africa localization

- for election and politics markets, require precise rule templates and named resolution sources
- during debates, poll releases, election results, or big football matches, display integrity notices if trading is delayed or paused
- add “pending, accepted, matching, partially filled, settled” status language that normal users can understand
- build public runbooks for how markets pause, close, dispute, or resolve

### What to avoid copying directly

- limited-category narrowness if you want broader East African relevance
- operational instability as a normal product behavior
- old-school, less polished consumer UX patterns

## 4. Manifold Markets

### What it does well

- lowers onboarding friction dramatically
- makes prediction markets social and participatory
- allows community-created markets
- uses comments, topics, quests, referrals, and creator incentives
- supports many market types beyond simple binary

### Official signals worth studying

- Manifold describes itself as a social prediction game
- users can sign in quickly and start for free
- anyone can create markets
- users earn progress through trading, quests, sharing, referrals, and creation
- market creators are encouraged to set clear resolution criteria, add topics, write a comment with sources, and seed liquidity

### Best ideas to borrow

- fast onboarding
- comments directly on markets
- user or creator-generated market suggestions
- topic pages and community discovery
- creator incentives and referrals
- comment-first knowledge sharing

### Kenya / East Africa localization

- launch with a safe “demo mode” or play-money practice layer for onboarding and education
- let users suggest markets before allowing public self-serve creation
- add creator profiles for journalists, analysts, football fans, creators, or verified experts
- reward good participation through streaks, reputation, badges, and referrals
- encourage users to post source-backed reasoning in comments

### What to avoid copying directly

- fully open market creation on day one
- low-moderation community behavior in a real-money environment
- game mechanics that weaken trust in a money product

## 5. Metaculus

### What it does well

- treats forecasting quality seriously
- uses tournaments to create recurring engagement
- uses scoring, leaderboards, and medals to reward quality
- supports private forecasting spaces and institutional use cases
- distinguishes between community predictions and higher-order aggregates

### Official signals worth studying

- Metaculus positions itself as a forecasting platform and aggregation engine
- it runs forecasting tournaments with prize pools
- it uses leaderboards and medals to rank high-quality forecasters
- it provides score systems designed to reward sincere probability judgments
- it offers private instances and structured partner programs

### Best ideas to borrow

- forecaster leaderboards
- accuracy-based reputation
- category-specific tournaments
- community versus expert or weighted aggregate views
- private forecasting products for institutions later

### Kenya / East Africa localization

- add leaderboards for Kenya Politics, Football, Economy, Weather, and Creator Markets
- launch tournament seasons around AFCON, EPL, Kenya election cycles, budget day, rainfall seasons, or major East African business questions
- create verified forecaster badges for analysts, journalists, agronomists, sports experts, and economists
- later offer private or enterprise forecasting spaces for media houses, NGOs, agribusinesses, research groups, or financial institutions

### What to avoid copying directly

- overly academic UX on the core consumer market screens
- too much scoring complexity before users understand the product
- burying the tradeable market experience under research language

## Kenya / East Africa Product Concepts Inspired by the Benchmarks

## 1. Probability-First Home Page

Borrow from Polymarket:

- featured markets
- trending cards
- visible probability bars
- fast scan layout

Localize for East Africa:

- categories on top: Kenya Politics, Football, East Africa Business, Weather, Agriculture, Entertainment, Global
- warm ivory background, bold red and blue accents, East African geometric trims
- KES volume, not generic dollar volume

## 2. Trust and Integrity Layer

Borrow from Kalshi and PredictIt:

- event-contract seriousness
- resolution-source discipline
- heavy-volume notices
- market integrity language

Localize for East Africa:

- “How this market resolves” card on every market
- “Resolution source verified” label
- “Trading paused” banners with human-readable explanations
- public integrity page with dispute rules, payout rules, and market monitoring standards

## 3. Community and Growth Layer

Borrow from Manifold:

- comments
- referrals
- creator incentives
- topic pages
- easy sign-up

Localize for East Africa:

- market comments should support plain English, source links, and mobile-friendly discussion
- creator program for sports creators, business analysts, political commentators, and campus communities
- referral rewards and onboarding walkthroughs tied to safe first actions, not blind deposits

## 4. Forecast Reputation Layer

Borrow from Metaculus:

- accuracy scoring
- leaderboards
- medals
- tournaments

Localize for East Africa:

- top forecasters in Kenya Politics
- top football forecasters
- best weather and agriculture forecasters
- monthly East Africa prediction cups

## 5. Rules and Resolution Layer

Borrow from PredictIt, Polymarket, and Manifold:

- named resolution source
- edge-case handling
- creator or admin evidence
- clear closure language

Localize for East Africa:

- standard templates for election markets, football markets, macroeconomic markets, weather markets, and entertainment markets
- named sources like IEBC, CBK, KNBS, Kenya Met, official league sites, official federation sites, or recognized publishers if legally appropriate

## Feature Benchmark Grid

| Platform | Best Idea | Why It Works | SokoOdds Adaptation | Priority |
|---|---|---|---|---|
| Polymarket | Probability-first cards | Makes the product instantly legible | Use clean cards with YES probability, KES volume, close time | Now |
| Polymarket | Event + market grouping | Improves navigation for related outcomes | Group election, awards, and league markets into event hubs | Now |
| Polymarket | Explicit resolution rules | Builds trader trust | Add mandatory “rules + source + edge cases” block | Now |
| Kalshi | Trust/compliance framing | Makes the product feel credible | Add market integrity, payout, and monitoring pages | Now |
| Kalshi | Event-contract discipline | Encourages structured listings | Create admin listing templates by market category | Now |
| Kalshi | Combo builder | Adds advanced portfolio products | Consider football multi-leg combos after core product stabilizes | Later |
| PredictIt | Closure and surge notices | Helps users during volatile events | Add high-volume notices and pending-order banners | Now |
| PredictIt | Resolution discipline | Reduces ambiguity and disputes | Build strict rule wording for political markets | Now |
| Manifold | Easy onboarding | Reduces drop-off | Add practice mode or guided first market flow | Now |
| Manifold | Community-created markets | Expands supply and engagement | Start with market suggestions, then moderated creator markets | Later |
| Manifold | Quests/referrals | Creates repeat usage | Add streaks, referrals, and comment/reason badges | Later |
| Metaculus | Leaderboards and medals | Rewards skill, not only speculation | Add forecaster ranks by category and season | Later |
| Metaculus | Tournaments | Creates recurring high-value engagement | Run monthly and seasonal prediction tournaments | Later |
| Metaculus | Private instances | Opens B2B future lines | Offer private forecasting spaces to institutions | Much later |

## What to Copy

### Copy from Polymarket

- homepage browsing structure around trending, active, and time-sensitive markets
- fast Yes/No interaction and probability-first cards
- broad topic coverage beyond only politics
- clear payout intuition where winning positions settle to a fixed unit value

### Copy from Kalshi

- contract discipline and event-market framing
- strong integrity and anti-manipulation positioning
- institutional-feeling market templates
- advanced product thinking only after the core exchange is stable

### Copy from Manifold

- low-friction community participation
- comments and creator/community dynamics
- market-suggestion or user-contribution pipelines

### Copy from Metaculus

- leaderboards
- forecasting history
- tournaments
- scoring and accuracy reputation

### Copy from PredictIt

- careful question wording
- explicit close and resolution logic
- high-volume notices and user guidance during event spikes

## What to Localize for Kenya and East Africa

### Payments

This is one of SokoOdds’ biggest product differentiators.

Inference from the benchmark set:

- the major global references are not optimized around Kenya-native payment flows
- local trust and growth will depend heavily on making deposits and withdrawals feel normal, fast, and mobile-first

Practical implication:

- prioritize mobile-first payment UX
- make deposit and withdrawal states understandable to first-time users
- design onboarding around local payment trust, not around foreign brokerage patterns

### Categories

Start with categories that feel culturally immediate:

- Kenya politics
- football
- macroeconomy
- business
- weather and agriculture
- entertainment
- public affairs

### Trust Language

Localize the trust layer heavily:

- visible market rules
- named resolution sources
- clear dispute process
- anti-abuse and market-monitoring language
- “why this market can be trusted” surfaces

### Community Layer

Do not make the platform only about trading:

- comments
- profiles
- analyst or creator identity
- later leaderboards and forecasting reputation

## What to Avoid

- do not make the product feel like pure speculative thrill with no information value
- do not launch with advanced contracts before binary markets are stable
- do not allow loose market wording
- do not force crypto-native or finance-heavy jargon onto mainstream users
- do not open public market creation without moderation readiness

## V1 Feature Direction

SokoOdds v1 should borrow this mix:

- Polymarket-style UI for browsing, odds display, and fast Yes/No interaction
- Kalshi-style trust, integrity posture, and contract structure
- PredictIt-style resolution clarity and closure wording
- light Manifold-style comments and user reasoning
- Metaculus-inspired reputation kept as a roadmap item, not a launch dependency

## Feature-by-Feature Decision

### Homepage

Copy mainly from Polymarket.

### Market Rules and Resolution

Copy mainly from Kalshi and PredictIt.

### Community

Copy mainly from Manifold, but stage cautiously.

### Forecaster Reputation

Copy mainly from Metaculus.

### Advanced Contracts

Study Kalshi, but add later only after core binary markets are healthy.

### API and Developer Ecosystem

Study Polymarket’s public docs and ecosystem posture later if SokoOdds wants bots, builders, or third-party market data consumers.

## What SokoOdds Should Copy Now

- Polymarket-style market card hierarchy
- Polymarket-style probability presentation
- Kalshi-style trust framing
- PredictIt-style resolution discipline
- Manifold-style comments and user reasoning
- Metaculus-style future roadmap for leaderboards

## What SokoOdds Should Copy Later

- Kalshi-style combo builder
- Manifold-style creator market expansion
- Manifold-style quests and reputation loops
- Metaculus-style tournaments and medal systems
- Metaculus-style private institutional spaces

## What SokoOdds Should Avoid

- crypto-native jargon as the main consumer language
- permissionless market creation at launch
- weak moderation in a money product
- academic forecasting UX on the main trading screen
- unclear closure and dispute rules
- showing “price” without also showing what it means in probability and payout terms

## Kenya and East Africa-Specific Category Ideas

### Politics and Public Affairs

- Will candidate X win county Y?
- Will party X win the Nairobi governorship?
- Will parliament pass bill X by date Y?
- Will policy X take effect before date Y?

### Football and Sports

- Will Kenya qualify for tournament X?
- Will Gor Mahia finish above AFC Leopards?
- Will team X win the CAF tie?
- Will player X score in match Y?

### Economy and Business

- Will CBK raise or hold rates by date Y?
- Will inflation be above X% next month?
- Will the KES close above or below threshold X?
- Will fuel prices rise next review period?

### Weather and Agriculture

- Will county X receive above-normal rainfall this season?
- Will tea output exceed threshold Y this quarter?
- Will maize prices in market X rise above threshold Y?

### Entertainment and Culture

- Will artist X win award Y?
- Will show or artist X top trend list by date Y?
- Will team or creator X hit milestone Y?

## Recommended Product Blend

For SokoOdds, the best benchmark blend is:

- Polymarket for the trading surface
- Kalshi for trust and structure
- PredictIt for wording and market discipline
- Manifold for community and growth
- Metaculus for reputation and forecasting depth

## Suggested Product Weighting

If SokoOdds is being shaped specifically for Kenya:

- 50% Polymarket
- 25% Kalshi
- 10% PredictIt
- 10% Manifold
- 5% Metaculus

This means:

- highly polished market UI
- strong rules and trust framework
- crisp resolution wording
- some social participation features
- later leaderboard and forecasting-identity layers

## Launch Identity

Recommended launch positioning:

**A Kenya-first event market and forecasting platform for politics, sports, business, and public affairs.**

Why this works:

- more credible than a pure betting clone
- more engaging than a dry forecasting site
- more local than global prediction-market brands

## Immediate Product Implications

Based on the benchmark set, SokoOdds should launch with:

- market discovery built around trending, active, and closing-soon surfaces
- binary Yes/No markets only
- strong rules, resolution source, and settlement clarity on every market
- mobile-first local payment UX
- comments and reasoning on market pages
- local categories that feel relevant every week, not only during election periods
- a roadmap for leaderboards, tournaments, creator markets, and advanced products after v1 is stable

## Implementation Rule

As SokoOdds progresses, do not implement major frontend flows in isolation. Use live benchmark review first, then translate those observations into local product decisions that prioritize:

- Kenya-first trust
- mobile-first speed
- KES and M-Pesa clarity
- disciplined market wording
- low-friction but high-confidence action flows

## Sources

- 5050 Markets market page: [5050markets.com/majembe-vs-mbavu-destroyer-who-wins](https://5050markets.com/majembe-vs-mbavu-destroyer-who-wins)
- 5050 Markets proposals page: [5050markets.com/proposals](https://5050markets.com/proposals)
- Spreadhit homepage: [spreadhit.com](https://spreadhit.com/)
- Bayse FAQ for prediction markets: [bayse.markets/faqs/faqs-for-prediction](https://www.bayse.markets/faqs/faqs-for-prediction)
- Bayse prohibition policy: [bayse.markets/prohibition-policy](https://www.bayse.markets/prohibition-policy)
- Predicta user guide: [docs.predictamarkets.com/user-guide](https://docs.predictamarkets.com/user-guide)
- Predicta account setup: [docs.predictamarkets.com/user-guide/account-setup](https://docs.predictamarkets.com/user-guide/account-setup)
- Predicta market types: [docs.predictamarkets.com/user-guide/market-types](https://docs.predictamarkets.com/user-guide/market-types)
- Predicta market prices: [docs.predictamarkets.com/user-guide/market-prices](https://docs.predictamarkets.com/user-guide/market-prices)
- Predicta withdrawals: [docs.predictamarkets.com/user-guide/withdrawing-funds](https://docs.predictamarkets.com/user-guide/withdrawing-funds)
- Stripe homepage: [stripe.com](https://stripe.com/)
- Stripe Elements: [stripe.com/payments/elements](https://stripe.com/payments/elements)
- Polymarket main site: [polymarket.com](https://polymarket.com/)
- Polymarket docs overview: [docs.polymarket.com/welcome](https://docs.polymarket.com/welcome)
- Polymarket docs, Markets & Events: [docs.polymarket.com/concepts/markets-events](https://docs.polymarket.com/concepts/markets-events)
- Polymarket docs, Prices & Orderbook: [docs.polymarket.com/concepts/prices-orderbook](https://docs.polymarket.com/concepts/prices-orderbook)
- Polymarket docs, Order Lifecycle: [docs.polymarket.com/concepts/order-lifecycle](https://docs.polymarket.com/concepts/order-lifecycle)
- Polymarket docs, Resolution: [docs.polymarket.com/concepts/resolution](https://docs.polymarket.com/concepts/resolution)
- Polymarket help, How Are Markets Created?: [help.polymarket.com/en/articles/13364541-how-are-markets-created](https://help.polymarket.com/en/articles/13364541-how-are-markets-created)
- Kalshi help, What is Kalshi?: [help.kalshi.com/en/articles/13823763-what-is-kalshi](https://help.kalshi.com/en/articles/13823763-what-is-kalshi)
- Kalshi help, How are prices determined?: [help.kalshi.com/markets/markets-101/how-are-prices-determined](https://help.kalshi.com/markets/markets-101/how-are-prices-determined)
- Kalshi help, How is Kalshi regulated?: [help.kalshi.com/en/articles/13823765-how-is-kalshi-regulated](https://help.kalshi.com/en/articles/13823765-how-is-kalshi-regulated)
- Kalshi help, Combos: [help.kalshi.com/en/articles/13823820-combos](https://help.kalshi.com/en/articles/13823820-combos)
- Manifold docs FAQ: [docs.manifold.markets/faq](https://docs.manifold.markets/faq)
- Metaculus about: [metaculus.com/about](https://www.metaculus.com/about/)
- Metaculus tournaments: [metaculus.com/services/tournaments](https://www.metaculus.com/services/tournaments/)
- Metaculus leaderboards: [metaculus.com/leaderboard](https://www.metaculus.com/leaderboard/)
- Metaculus scores FAQ: [metaculus.com/help/scores-faq](https://www.metaculus.com/help/scores-faq/)
- PredictIt analysis archive and market commentary: [analysis.predictit.org](https://analysis.predictit.org/)
- PredictIt trading notice on heavy-volume periods: [news.predictit.org/post/633698714399260673/important-2020-election-day-trading-notice](https://news.predictit.org/post/633698714399260673/important-2020-election-day-trading-notice)
- PredictIt market-settlement notice: [news.predictit.org/post/637127781870878720/please-read-important-market-closure-notice](https://news.predictit.org/post/637127781870878720/please-read-important-market-closure-notice)
