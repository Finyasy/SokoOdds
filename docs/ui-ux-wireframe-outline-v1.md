# SokoOdds UI/UX Wireframe Outline V1

## Purpose

This document converts the visual direction into realistic low-fidelity wireframe structure for:

- homepage
- markets discovery page
- market-detail page
- mobile trade flow
- key overlays

It is intentionally practical and Kenya-market aware.

## Shared Principles

### Visual tone

- warm ivory canvas
- premium but calm card framing
- restrained line usage
- compact market density where needed
- more editorial presentation for hero and key market surfaces

### Typography

- hero and flagship headlines in `Newsreader`
- UI copy in `Plus Jakarta Sans`
- clear numeric emphasis for percentages and KES amounts

### Icon use

Include icons in the same disciplined way seen in the reference screenshots:

- search icon in global search
- bookmark and share on feature markets
- clock for close time
- chart or trend icon for movement
- wallet or lightning icon for M-Pesa and withdrawals
- WhatsApp icon in alerts and prompts
- market identity icons such as flags, portraits, team badges, or institution cues on selected cards

Icons should clarify, not decorate.

### Market identity media

Take the Polymarket event-card approach seriously.

For event cards and headline markets, the icon should usually represent the subject of the market itself.

Examples:

- USA market: use the US flag or the most relevant subject identity
- Kenya governance market: use Nairobi, parliament, IEBC, or a governance cue
- football market: use team or competition identity
- politician market: use a portrait avatar
- weather market: use county or climate identity only if a stronger subject cue is unavailable

This is more useful than a generic category icon because it makes the market instantly scannable.

## Homepage Wireframe

### Desktop block order

#### 1. Sticky header

Left:

- wordmark
- optional short product descriptor

Center:

- global market search

Right:

- WhatsApp button
- sign in
- primary trade CTA
- menu icon

Below header row:

- category navigation strip
- trending state or active category state

### Header behavior

- transparent to warm backdrop on top
- gains a soft shadow and faint divider on scroll
- category strip remains highly scannable
- right side keeps `Log In`, `Sign Up`, and a utility menu trigger
- utility menu includes portfolio, cash, deposit, leaderboard, docs, and help

#### 2. Editorial hero

Left column:

- large headline
- Kenya-first value proposition
- primary CTA
- secondary CTA
- one trust line with icon

Right column:

- featured event market card
- event graph
- YES and NO buttons
- KES volume and close time
- save and share icons
- market identity media such as a flag, portrait, or team badge

Side rail:

- `Breaking now`
- compact ranked items
- percent change or movement

### Hero example content

Headline:

- `Trade Kenyan events with clearer rules, visible payouts, and M-Pesa-ready wallets.`

Featured market:

- `Will CBK cut its benchmark rate before Sept 30, 2026?`

Supporting live list:

- `Will Nairobi county sign the urban mobility bill before June 30, 2026?`
- `Will Gor Mahia finish above AFC Leopards this season?`
- `Will long rains in Nakuru finish above normal?`

#### 3. Signal strip

Horizontal row of compact controls:

- Trending now
- Ending soon
- Politics
- Football
- Economy
- Weather
- Culture

Optional tiny icons:

- trend arrow
- clock
- shield

#### 4. Featured market board

Section header:

- `All markets`
- optional utility icons for filter, saved, sort

Grid structure:

- compact mixed-size cards in a four-column desktop grid
- one or two trend cards can show a mini chart
- most cards should stay text-first and outcome-first
- `Show more markets` sits centered below the first board before the footer

Card anatomy:

- market avatar or icon
- short title
- one or two outcomes
- percentage or odds
- compact metadata line
- optional bookmark icon

Card identity rule:

- prefer subject identity media over generic glyphs
- for country markets, use flags
- for people markets, use portraits
- for sports markets, use team or match identity
- for institutions, use a recognizable institutional cue

Card density rule:

- do not show full dates on every compact card
- do not repeat the full question when a short label works
- do not place the same mini chart on every card
- allow some cards to use option rows, some to use binary action pills, and some to use a mini gauge or sparkline

#### 5. Trust row

Three cards:

- resolution source trust
- protected wallet state
- M-Pesa-native funding

These should sit above the footer and below the main market board.

#### 6. Footer

Columns:

- markets by board
- funding and wallet
- support and social
- company

Bottom legal row:

- copyright
- privacy
- terms
- help center
- language selector

The footer should feel open, quiet, and utility-first like the Polymarket reference rather than a heavy marketing block.

## Markets Discovery Page Wireframe

### Desktop block order

#### 1. Shared header

Same as homepage.

#### 2. Discovery intro

Top row:

- page title `All markets`
- utility icons

Second row:

- horizontally scrollable category chips

Third row:

- signal strip or focus strip

#### 3. Market grid

Rows of cards with controlled variation:

- featured cards at top
- standard cards below
- compact cards only if needed in side rails

### Discovery card sizing

Use three card sizes:

- feature
- standard
- compact

Avoid a page where every card has the same visual weight.

### Discovery market mix

Ensure the first visible set includes:

- one crypto trend card
- one Nairobi Stock Exchange card
- one commodities card
- one Kenya governance card
- one football market

This keeps the board varied and more believable.

### Kenya realism for card content

Mix these types:

- Nairobi governance
- CBK policy
- FKF football standings
- Kenya weather seasons
- entertainment events with official ticketing or promoter sources

Avoid:

- generic global meme markets dominating first load
- categories that weaken trust at launch

## Market-Detail Page Wireframe

### Desktop block order

#### 1. Utility and breadcrumb row

Contains:

- breadcrumb back to markets
- category
- status badge
- bookmark
- share
- identity media near or above the market title when useful

#### 2. Story and price header

Left:

- large market question
- short summary
- probability display

Identity-media option:

- if the market is country-led, place a flag near the headline
- if the market is person-led, place a portrait avatar near the headline
- if the market is sports-led, place team identity near the headline or in the stat row

Right:

- compact supporting stat cluster
- close time
- KES volume
- liquidity
- resolution source

#### 3. Graph card

Contains:

- event graph
- timeframe controls
- current price marker
- KES volume line below

This should be one of the strongest visual anchors on the page.

#### 4. Sticky trade rail

Top of rail:

- buy or sell segmented control
- selected outcome state

Middle:

- price
- quantity or amount
- estimated stake
- estimated payout
- balance summary

Bottom:

- readiness state
- primary CTA

Supporting note:

- short explanation for reserved funds or wallet readiness

#### 5. Rules and trust band

Two-column content band:

- how this market resolves
- trust and monitoring notes

This area should feel readable, not box-heavy.

#### 6. Activity band

Tabbed or segmented area:

- recent trades
- order book
- community or comments

If the comments area is present, make it calmer and more text-led than social-app noisy.

## Mobile Market Wireframe

### Order

1. compact header
2. market title and status
3. top probability block
4. sticky trade bar
5. summary
6. graph
7. rules
8. recent trades
9. collapsed order book

### Sticky trade bar

Left:

- selected YES or NO
- current price

Right:

- primary CTA

Behavior:

- remains visible while scrolling
- opens bottom-sheet ticket

### Bottom-sheet ticket

#### Top

- buy or sell tabs
- current price

#### Middle

- quantity controls
- balance summary
- payout preview

#### Bottom

- primary CTA
- concise helper note

### Mobile rules

- no dense side-by-side card logic
- no always-open order book
- no duplicated metadata in multiple places
- KES amount must stay visible near the CTA

## WhatsApp Prompt Wireframe

### Structure

Top:

- WhatsApp icon
- short eyebrow

Middle:

- strong heading
- one short paragraph
- one icon-led feature card

Bottom:

- primary CTA: join alerts
- secondary action: maybe later

### Copy direction

Use practical Kenyan utility framing:

- pause notices
- settlement updates
- new market drops
- no spam tone

## M-Pesa Verification Wireframe

### Structure

Top:

- short timing pill
- large headline
- one sentence explaining instant withdrawals

Middle:

- one benefit card with lightning or wallet icon
- phone number field
- pending, success, or error status block

Bottom:

- primary CTA
- secondary skip action

### State rules

Pending:

- calm green highlight
- short processing message

Success:

- strong confirmation message
- explain that KES 5 returns to wallet

Error:

- soft red alert block
- direct explanation
- retry CTA

## Realistic Kenya Launch Content Model

### Homepage and discovery examples

- `Will Nairobi county sign the urban mobility bill before June 30, 2026?`
- `Will CBK cut its benchmark rate before Sept 30, 2026?`
- `Will Gor Mahia finish above AFC Leopards this season?`
- `Will long rains in Nakuru finish above normal this season?`
- `Will Sauti Sol sell out at Kasarani?`

### Source framing

Each relevant surface should be ready to display:

- county gazette notice
- CBK statement
- FKF official table
- Kenya Meteorological Department report
- promoter or official ticketing page

This makes the product feel genuinely Kenya-first instead of superficially localized.

## Final Recommendation

Use this wireframe outline together with:

- `docs/ui-ux-ideation-brief.md`
- `docs/ui-ux-visual-direction-v2.md`

The next design pass should turn these wireframes into:

- a homepage mock
- a markets discovery mock
- a market-detail mock
- a mobile trade-flow mock
