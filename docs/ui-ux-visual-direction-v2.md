# SokoOdds UI/UX Visual Direction V2

## Purpose

This document turns the broader UI/UX ideation into a tighter visual direction for SokoOdds.

It defines:

- one font direction
- one color system
- one homepage wireframe outline
- one market-detail wireframe outline

This is still a design-direction document, not code guidance.

## Core Direction

SokoOdds should feel like a Kenya-first market product with:

- the scan-ability of Polymarket
- the softness and premium calm of the Claude reference surfaces
- the trust and utility of a serious M-Pesa-native financial interface

The design goal is not to look flashy.

The design goal is to feel:

- trustworthy
- fast to scan
- premium without looking expensive
- local without feeling improvised

## Final Font Decision

### Primary Pairing

- display: `Newsreader`
- UI: `Plus Jakarta Sans`

### Why this pairing

- `Newsreader` gives the homepage hero and major market titles an editorial authority that the current UI lacks
- `Plus Jakarta Sans` stays clean, contemporary, and legible for chips, forms, prices, and dense market cards
- together they create a useful distinction between narrative surfaces and trading surfaces

### Font usage rules

Use `Newsreader` for:

- homepage hero headline
- section titles on marketing-style surfaces
- major market question headline on desktop
- premium onboarding and wallet confirmation headers

Use `Plus Jakarta Sans` for:

- navigation
- filters and chips
- card labels and metadata
- prices and percentages
- form labels and helper text
- button text

### Sizing direction

- hero headline: large, spacious, editorial
- market question headline: large but tighter than hero
- section headings: medium-large with strong weight
- body copy: short lines, generous line height
- metadata: quiet and compact

### Numeric handling

Percentages, KES amounts, and times should use:

- strong weight
- tighter tracking
- tabular numerals where possible

### Type scale

Use this as the default visual scale direction:

- homepage hero headline: `56-64px`, `Newsreader`, medium weight, tight line height
- homepage section title: `34-40px`, `Newsreader`, medium weight
- market-detail headline desktop: `46-52px`, `Newsreader`, medium weight
- market-detail headline mobile: `30-36px`, `Plus Jakarta Sans`, bold
- featured card question: `26-30px`, `Plus Jakarta Sans`, semibold
- standard card title: `20-24px`, `Plus Jakarta Sans`, semibold
- primary percentage: `36-44px`, `Plus Jakarta Sans`, bold
- nav and filter chips: `15-17px`, `Plus Jakarta Sans`, medium
- body copy: `18-20px`, `Plus Jakarta Sans`, regular
- metadata and helper copy: `13-15px`, `Plus Jakarta Sans`, medium
- tiny labels and chart captions: `12-13px`, `Plus Jakarta Sans`, medium

### Type feel from references

Adopt:

- the calm editorial headline presence seen in the Claude screenshots
- the compact, dense but readable market labels seen in the Polymarket screenshots

Avoid:

- over-condensed type
- tiny metadata that feels exchange-heavy
- generic system-font fallback styling in final UI

## Final Palette Decision

### Brand identity update

SokoOdds should now anchor its brand system on the lion mark:

- deep royal blue
- electric sky blue
- vivid orange

The lion mark should replace temporary monogram placeholders in:

- header
- footer
- utility menu avatar

The wider UI can still stay calmer than the logo itself, but the logo should be unmistakably SokoOdds.

### Base palette

- canvas: `#F7F3EC`
- surface: `#FFFDF8`
- surface-soft: `#F3EDE2`
- text-primary: `#151515`
- text-secondary: `#6D6A63`

### Brand palette

- brand-primary: `#B6492E`
- brand-deep: `#8F3723`
- trust-green: `#5E9F49`
- trust-green-soft: `#EAF5E4`
- data-blue: `#3559E6`
- data-blue-soft: `#E8EEFF`
- danger-soft: `#FBE6E4`
- danger-text: `#A33B32`

### Supporting neutrals

- line-soft: `rgba(21, 21, 21, 0.08)`
- line-faint: `rgba(21, 21, 21, 0.04)`
- shadow-soft: `0 16px 40px rgba(34, 24, 14, 0.06)`
- shadow-lifted: `0 22px 54px rgba(34, 24, 14, 0.10)`

### Color rules

- use terracotta for primary brand emphasis, not for every CTA
- use green for trust, M-Pesa readiness, and positive financial confirmation
- use blue for chart data and market trend context
- use pale red only for errors and negative outcomes
- keep most page backgrounds neutral and warm

### What to remove

- visible background grids
- strong outlines on every card
- overly saturated reds and greens in normal UI states
- decorative color use that competes with market prices

### Reference feel translation

From Polymarket:

- cool, precise chart blue
- pale positive and negative chips
- restrained navigation chrome

From Claude:

- warm ivory canvas
- soft premium card edges
- gentle shadow and tonal layering
- cleaner whitespace rhythm

From Kenya-first product needs:

- M-Pesa green must feel authentic and trustworthy
- terracotta should carry warmth and brand identity
- neutral backgrounds should keep KES amounts and trust states easy to read

## Surface and Border System

### Surface model

Use three levels of surface:

1. canvas
2. elevated card
3. instrument panel

### Rules

- homepage hero and feature cards use elevated surfaces with soft shadow
- discovery cards use mostly flat surfaces with subtle edge definition
- the order ticket uses a slightly denser instrument-panel treatment
- only inputs, selected states, and errors should rely on visible borders

### Icon direction

SokoOdds should use two icon systems:

1. utility icons
2. market-identity icons

### Utility icons

These are the smaller UI icons used for actions and navigation:

- search
- bookmark or save
- share
- trending or movement
- wallet or payments
- WhatsApp alerts
- chart timeframe or analytics
- market status and trust signals

Style rules:

- use outlined icons or lightly filled icons
- keep stroke weight consistent
- use them as support, not decoration
- pair them with labels on trust, wallet, and utility surfaces

### Market-identity icons

This is the Polymarket-inspired direction that matters most for event cards and market recognition.

Use subject-specific identity media so a user can understand the market before reading every word.

Examples:

- country or geopolitical market: flag or national cue
- football market: team crest, league badge, or federation cue
- politician or public figure market: portrait avatar
- institution market: parliament, CBK, IEBC, court, or ministry cue where appropriate
- weather market: county or climate icon if a stronger official identity is unavailable
- culture market: artist image, venue mark, or promoter cue where appropriate

Market-identity rules:

- each major market card should have one recognizable visual anchor
- featured markets should use larger identity media than standard cards
- identity media should feel clean and editorial, not sticker-like
- prefer square or softly rounded avatars
- do not overload one card with too many subject icons unless it is a matchup market
- when upstream API data is partial, preserve local presentation assets like icon tiles and visual tokens instead of dropping back to text-only badges
- high-visibility Kenya-first markets should prefer local logo-style tiles:
  - `CBK` for policy and FX markets
  - `NSE` for Nairobi Stock Exchange thresholds
  - club/federation-style tiles for FKF markets
  - county/weather tiles for local rainfall and heatwave contracts
  - artist or event tiles for culture markets
  - nightlife/event brands like `Blankets & Wine` should use event-style marks instead of text-only abbreviations

### Head-to-head market rule

For matchup or versus-style markets, use dual identity markers similar to Polymarket:

- team vs team
- country vs country
- candidate vs candidate

Layout direction:

- two icons side by side
- or one dominant icon with a secondary badge if space is tight

### Kenya-specific note

- M-Pesa and WhatsApp should keep their familiar green cues
- utility icons should remain secondary
- market-identity icons should feel factual, recognizable, and locally believable

## Board Card Direction

SokoOdds should stop using one repeated card formula across the whole board.

The Polymarket references work because the page mixes:

- compact binary cards
- range or threshold cards
- live momentum cards
- occasional cards with a mini gauge or trend line

### New rule

Do not place a chart on every board card.

Use charts selectively for:

- bitcoin and other momentum-heavy macro cards
- featured trend cards
- home hero or trend slider cards

For most board cards, prefer:

- one short title
- one or two option rows
- two small Yes and No action pills
- one compact footer line for volume and board type

### Copy rule for cards

Do not repeat full long-form market questions inside dense boards.

Use short labels like:

- `BTC above 110K`
- `NSE 20 above 4700`
- `Crude oil 100`
- `CBK rate cut`
- `Gor above AFC`

Avoid:

- repeating the entire deadline in the card title
- adding dates as a second line unless the timing is the main story
- long subtitle copy inside compact cards

### Metadata rule

Board cards should usually show:

- volume
- board tag such as `Crypto`, `NSE`, `Macro`, `FKF`, `Oil`
- live or closing-soon state only when it matters

Board cards should usually not show:

- full calendar dates
- long region strings
- repeated rule text

## Trending Hero Data Mix

The homepage trend slider should not rely only on generic policy markets.

It should deliberately mix:

- one crypto momentum market
- one Nairobi Stock Exchange market
- one commodities market such as iron or oil
- one Kenya macro or policy market such as CBK

### Trend-first hero examples

- `BTC above 110K`
- `NSE 20 above 4700`
- `Crude oil 100`
- `CBK rate cut`

### Trending chart behavior

For the hero slider, use the Polymarket-style richer graph treatment:

- primary blue line for the active outcome
- one to three comparison lines when the market has useful price bands
- left-side option rows with their current probabilities
- one or two comment snippets below the price bands
- restrained market artwork panels for flagship contracts like BTC, NSE, crude oil, and CBK
- artwork should feel editorial and market-specific, not like promo banners
- keep artwork limited to the hero and selected chart-led cards so the board stays clean

This makes the hero feel alive without making the main board noisy.

## Footer Direction

The footer should follow the Polymarket reference more closely.

### Structure

Top:

- brand mark
- one short brand sentence
- one short product sentence or social row

Middle:

- markets by board
- funding and wallet
- support and social
- company

Bottom:

- legal links
- copyright

### Show More Markets placement

`Show more markets` should sit directly below the first market grid, centered, before the footer begins.

It should feel like a continuation of discovery, not a footer link.

## Header Utility Menu

The top-right utility cluster should combine:

- `Log In`
- `Sign Up`
- a menu trigger

The dropdown should echo the Polymarket browsing feel while remaining Kenya-native.

### Dropdown content

- Portfolio
- Cash balance
- Deposit
- Leaderboard
- Dark mode placeholder or future state
- Documentation
- Help Center
- M-Pesa deposit
- Paybill deposit

### Kenya-specific note

For SokoOdds, `Deposit` should be mentally tied to:

- M-Pesa STK push
- Paybill fallback

not generic bank funding language.

### Corner radius direction

- major cards: generous radius
- secondary cards: medium radius
- pills, chips, and buttons: full pill or soft rounded corners

## Homepage Wireframe Outline

### Goal

Make the homepage feel like a premium entry into live Kenyan event markets, not a plain feed shell.

### Desktop wireframe

#### 1. Sticky header

Contains:

- wordmark
- market search
- primary category row
- WhatsApp entry
- sign in or trade CTA

Design rules:

- translucent warm backdrop
- thin separator only at scroll state
- no always-on heavy bottom border

#### 2. Hero band

Left column:

- editorial headline in `Newsreader`
- one-line value proposition
- primary CTA: `Explore markets`
- secondary CTA: `How it works`
- one short trust line

Right column:

- one large featured market module
- mini chart
- YES and NO action buttons
- one narrow side rail for `Breaking now`

Design rules:

- this should be the dominant visual moment on the page
- no competing boxed strips above it
- this section should feel lighter and more expansive than the current homepage

#### Kenya-realistic homepage content

The homepage should feel locally believable, not globally generic.

Default launch themes should include:

- Kenya politics
- football
- economy and exchange-rate questions
- weather
- culture or entertainment with clear public sources

Sample content style:

- `Will Nairobi county sign the urban mobility bill before June 30, 2026?`
- `Will CBK cut its benchmark rate before Sept 30, 2026?`
- `Will Gor Mahia finish above AFC Leopards this season?`
- `Will long rains in Nakuru finish above normal this season?`

Trust language should reflect local confidence builders:

- named resolution source
- KES wallet visibility
- M-Pesa-ready funding
- clear pause and settlement alerts

Homepage identity-media direction:

- country-led event cards should use flags or equivalent national cues
- public-figure cards should use portraits
- sports cards should use team or league identity
- institution-driven cards should use a recognizable institutional cue before falling back to a generic glyph

#### 3. Signal strip

Short horizontal band below hero for:

- trending now
- ending soon
- politics
- football
- economy

Design rules:

- compact
- quieter than hero
- selected state through fill and type emphasis, not thick borders

Use small icons where helpful:

- trending arrow
- clock for ending soon
- shield or source indicator for trust surfaces

#### 4. Market board

Top row:

- section title `All markets`
- utility controls such as search, sort, saved

Body:

- asymmetric card grid
- mix of featured and standard cards
- one compact side column on large desktop if needed

Design rules:

- create hierarchy
- do not let every card look equal
- reduce line noise

#### Card anatomy

Every standard card should support:

- small market avatar or category icon
- compact category label
- strong question title
- one or two visible outcomes
- KES volume
- close time
- optional save or share icon

This should echo the market density of Polymarket while keeping the softer card feel of the Claude references.

Identity-media rules:

- prefer a meaningful event icon over a generic category icon
- if the market is about a nation, show a flag or national identity marker
- if the market is about a person, show the person
- if the market is about a team, show team identity
- if the market is about an institution, use an institutional cue before using a generic glyph

#### 5. Trust and product close

Before footer:

- three trust cards
- short Kenya-first payout statement
- one more CTA or category jump

#### 6. Footer

Use a more integrated footer zone:

- softer background shift
- clearer category groupings
- less empty vertical dead space

### Mobile homepage wireframe

#### Order

1. compact header
2. hero headline
3. featured market
4. signal strip
5. market cards
6. trust cards
7. footer

#### Mobile rules

- hero becomes one column
- featured market stays visible before long scrolling starts
- chips are horizontally scrollable
- avoid stacking too many bordered boxes before the first market card

## Market Detail Wireframe Outline

### Goal

Make market detail feel more decisive and premium while keeping trust and trading clarity high.

### Desktop wireframe

#### 1. Utility header

Contains:

- breadcrumb
- category
- status badge
- share or save actions

Design rules:

- light and quiet
- should not compete with the headline

#### 2. Market story block

Contains:

- market question in `Newsreader`
- one short context paragraph
- probability readout
- close time
- liquidity or volume
- resolution source

Design rules:

- strong story-first presentation
- more breathing room than current version
- status badge should be compact and calm

Use supporting icons for:

- close time
- resolution source
- saved state
- share
- trust or verification note

When helpful, place market identity media near the headline:

- flag for country-led event
- portrait for person-led market
- badge for team-led market

This should mirror the strongest Polymarket pattern where the market is instantly recognizable before the user reads the full question.

#### 3. Chart and market movement card

Contains:

- chart
- timeframe controls
- current trend label
- one compact supporting stat row

Design rules:

- remove prominent background grids
- use data blue as the lead chart color
- let the chart card feel like a primary product object

### Event-market graph direction

SokoOdds should explicitly adopt Polymarket-style event graphs for event-based markets.

Use this chart language on:

- homepage featured market cards
- markets-page featured cards
- market-detail pages

#### Chart model

- a clean line chart showing probability movement over time
- one primary line for YES probability
- optional mirrored NO context only where it adds clarity
- soft horizontal guides only
- no heavy vertical grid system
- subtle endpoint marker on the most recent value

#### Recommended usage by surface

Homepage featured market:

- compact chart
- short time range
- used to make the hero feel live and credible

Markets discovery featured cards:

- mini line chart or sparkline
- used only on featured or priority cards, not every card

Market-detail page:

- full event chart with timeframe switcher such as `1H`, `6H`, `1D`, `1W`, `1M`, `ALL`
- volume and close-time context below the chart
- chart should sit above rules and below the headline summary

#### Visual rules

- line should feel crisp and data-led, not decorative
- area fill is optional and should stay extremely light
- axes and tick labels should stay quiet
- use one strong blue family as the default chart color
- use green and red only for directional labels or outcome buttons, not for the whole chart

#### Product rationale

These graphs help event markets feel alive, tradable, and trustworthy.

Without them, the product risks feeling like a static betting card list instead of a living market surface.

#### 4. Sticky trading rail

Contains:

- buy and sell toggle
- price summary
- quantity or amount input
- balance summary
- readiness or wallet state
- primary trade CTA

Design rules:

- clearer split between information and action
- reduce helper-copy clutter
- one concise explanation block is enough
- reserved funds should appear in one consistent balance summary module

Type and spacing rules:

- buy and sell labels should feel large and decisive
- key amount or price text should be one of the boldest elements in the rail
- helper copy should be short and muted
- icon use should support comprehension, not crowd the rail

#### 5. Rules and trust section

Contains:

- how this market resolves
- edge cases
- trust and monitoring notes
- fairness or audit framing

Design rules:

- group these together in one narrative band
- fewer small cards
- better reading flow

#### 6. Activity section

Contains:

- recent trades
- order book
- community or comments

Design rules:

- use tabs or segmented controls if needed
- do not expose too many dense blocks at once
- order book lines should stay functional, not decorative

### Mobile market-detail wireframe

#### Order

1. title and status
2. YES and NO probabilities
3. sticky trade bar
4. summary
5. chart
6. rules
7. recent trades
8. order book collapse

#### Sticky mobile trade bar

Shows:

- selected market side
- key price
- one primary CTA

Action:

- opens bottom-sheet ticket

#### Bottom-sheet ticket

Contains:

- buy and sell tabs
- quantity controls
- balance summary
- wallet state
- CTA

Design rules:

- primary mobile conversion surface
- should feel focused and uncluttered
- should not require the whole ticket to live inline in the page

Kenya-realistic mobile note:

- if wallet is not ready, the CTA should clearly pivot to M-Pesa setup
- use plain direct copy such as `Verify M-Pesa to trade`
- keep KES amounts visible at every critical step

## Modal and Overlay Direction

### WhatsApp prompt

Use:

- smaller amount of copy
- one support card
- one stronger CTA
- softer dim layer
- tighter visual relationship to market alerts

Avoid:

- generic utility modal styling
- too many stacked boxes inside the modal

Use one icon-led feature row such as:

- alerts for pauses
- settlement updates
- new market drops

### M-Pesa verification modal

Use:

- high-confidence header
- large phone number display
- one status card for pending or error
- strong green confirmation state
- one clear primary action

Avoid:

- too many outline boxes
- extra status chrome that competes with the CTA

Reference feel:

- the confidence and utility of the Kenyan payment screenshots
- the cleaner spacing and softer framing of the Claude screenshots

Typography:

- large confident headline
- concise supporting copy
- very legible phone-number field
- clear green action button with restrained shadow

## Component Priorities

### First components to redesign

- `SiteHeader`
- `MarketSignalStrip`
- `MarketCard`
- `OrderTicket`
- `WhatsAppPrompt`
- wallet verification modal

### Components to keep structurally but restyle

- `ProbabilityPill`
- `RecentTrades`
- `OrderBook`
- footer groupings

## Do and Do Not

### Do

- create stronger hierarchy
- use fewer but better surfaces
- let type do more of the premium work
- keep trust and financial clarity visible
- design mobile around action reachability

### Do not

- copy Polymarket too literally
- make the UI overly dark
- use betting-site neon color language
- fill every screen with outlines
- let decorative patterns compete with data

## Recommended Next Design Pass

If this direction is approved, the next step should produce:

1. a homepage high-fidelity layout
2. a market-detail high-fidelity layout
3. a mobile trade-bar and bottom-sheet concept
4. a WhatsApp and M-Pesa modal redesign set

## Final Summary

The clearest V2 direction for SokoOdds is:

- `Newsreader` plus `Plus Jakarta Sans`
- warm ivory surfaces with terracotta, moss green, and muted data blue
- fewer lines, fewer borders, more tonal depth
- one premium homepage hero
- one stronger market-detail chart and ticket composition
- one mobile-first trade entry pattern built around a sticky action bar
