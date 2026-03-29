# SokoOdds UI/UX Ideation Brief

## Purpose

This document captures a non-code UI and UX improvement direction for SokoOdds based on:

- live review of the current local product using Playwright
- the existing SokoOdds documentation system
- the reference screenshots shared by the user

This is an ideation brief, not an implementation spec. It should guide a cleaner follow-up design pass for homepage, discovery, market detail, onboarding, and wallet states.

## What Was Reviewed

### Live pages reviewed with Playwright

- `/`
- `/markets`
- `/markets/nairobi-governor-bill-sign-before-june`

Screenshots were captured locally under:

- `artifacts/ui-ux-ideation/homepage.png`
- `artifacts/ui-ux-ideation/markets.png`
- `artifacts/ui-ux-ideation/market-detail-dismissed.png`
- `artifacts/ui-ux-ideation/market-detail-mobile.png`

### Reference patterns taken from the supplied images

- Polymarket for discovery density, compact market scanning, and side-rail market context
- Claude surfaces for premium card framing, softer section transitions, and calmer whitespace
- 5050-inspired Kenya-first wallet and M-Pesa states, but with a more refined finish than the raw reference

## Current UI Diagnosis

The current product is already structurally solid. The core issue is not missing information. The issue is visual tone and hierarchy.

### What is working

- trust surfaces are present
- market hierarchy is understandable
- order ticket logic is visible
- mobile content stacking is functional
- Kenyan language and M-Pesa framing are already present

### What is hurting the experience

- background grid lines are too visible and make the product feel scaffolded rather than premium
- almost every surface uses the same border language, so nothing feels primary
- typography is serviceable but not distinctive enough for either trust or excitement
- homepage and markets pages feel compressed into many small boxes instead of a deliberate reading flow
- the market detail page is clear but visually static and does not create enough contrast between story, price, and action
- the M-Pesa and WhatsApp overlays are useful but visually feel like utility dialogs, not signature product moments

## Proposed Visual Direction

### Design concept

Build toward an `editorial market terminal` feel:

- the clarity and market scan-ability of Polymarket
- the softness, depth, and premium framing of Claude product cards
- the direct local utility of Kenya-first M-Pesa onboarding

The product should feel:

- serious enough for money
- calm enough for daily use
- distinct enough to be memorable

## Typography Direction

### Recommendation

Use a two-layer type system:

- display type for hero moments, major market titles, and premium onboarding headers
- UI sans for navigation, cards, filters, forms, and data blocks

### Suggested font pairing

- display: `Newsreader` or `Instrument Serif`
- UI: `Plus Jakarta Sans`

### Why this works

- the serif display creates trust and editorial confidence without feeling old
- the sans UI font keeps cards, tabs, prices, and forms sharp and modern
- this creates a stronger distinction between `story` and `action`

### Usage rules

- homepage hero and section titles use display type
- market question headlines use display type on desktop and a stronger sans on mobile if space is tight
- navigation, chips, prices, probability pills, and form labels stay in UI sans
- numeric data should use tabular or semi-tabular figures where possible

## Color and Material Direction

### Immediate improvement

Remove the visible page grid and reduce hard border repetition.

The current UI is visually dominated by lines:

- page background lines
- inner panel borders
- repeated card outlines
- chip outlines

This creates noise and makes the interface feel more like a wireframe than a finished product.

### Recommended palette model

- canvas: warm ivory
- text: charcoal ink
- primary accent: refined terracotta or rust, not bright red
- trust accent: deep moss or M-Pesa green
- cool utility accent: muted slate-blue for secondary states
- data tints: pale green and pale rose, not bright trading red and green

### Material system

- most major cards should use tonal separation and shadow, not obvious borders
- reserve visible borders for inputs, selected states, and error states
- use soft ambient shadows with low blur instead of dark box shadows
- use subtle radial or directional light, not decorative grids

### Specific removal guidance

Remove or heavily tone down:

- the full-page square grid
- the grid texture inside major surface blocks
- repeated border lines between stacked panels unless they communicate state

Keep lines only where they help:

- form field edges
- comment list separators if needed
- order book table structure
- chart axis guides at low contrast

## Homepage Redirection

### Current problem

The homepage is informative but behaves more like a feed shell than a premium landing-to-market transition.

### Recommended homepage model

Use three visual zones:

1. a generous editorial hero
2. a focused live discovery strip
3. a denser market board below

### Hero recommendations

- increase vertical breathing room
- make the opening message feel more flagship and less utilitarian
- reduce the number of bordered containers visible above the fold
- turn the hero into one dominant composition rather than two adjacent white boxes

### Hero composition

Left:

- headline
- one-line value proposition
- two CTAs
- short trust caption

Right:

- one large featured market card with chart preview
- one slimmer sidebar module for `Breaking now` or `Ending soon`

### Why

This follows the strongest part of the Polymarket references while keeping the softer premium framing visible in the Claude screenshots.

## Discovery and Market Board

### Current problem

Cards scan well, but the board feels visually flat because every card uses the same weight, border strength, and panel logic.

### Recommendations

- introduce stronger card hierarchy between featured, standard, and compact cards
- make category chips quieter and selected states clearer
- reduce the number of outlined pills visible at once
- allow more whitespace between card content groups
- use larger corner radii on big surfaces and smaller radii on inner controls

### Board card model

Featured cards:

- large headline
- one dominant price read
- soft background tint
- optional mini chart or trend ring

Standard cards:

- clearer top meta row
- question with two-line clamp
- stronger probability alignment
- lighter metadata zone at bottom

Compact cards:

- used only in side rails or trend lists
- no extra chrome
- text-first scan pattern

## Market Detail Redesign

### Current problem

The market page is logically correct but visually under-dramatized.

The story, trust, and action zones all look similar in emphasis.

### New target hierarchy

1. story and confidence
2. current price and action
3. chart and market movement
4. rules and resolution confidence
5. social proof and activity

### Desktop layout direction

Keep the two-column structure, but make the left side feel more editorial and the right side feel more instrument-like.

Left column:

- larger headline
- more breathing room around summary
- chart inside one premium card
- resolution and fairness notes grouped together

Right rail:

- cleaner sticky ticket
- stronger buy and sell segmentation
- lower visual clutter in helper copy
- quieter supporting modules beneath the main action area

### Chart treatment

Use the Polymarket chart discipline but remove unnecessary chrome:

- fewer visible grid lines
- softer axis labeling
- one stronger line color
- subtle filled area only when helpful
- clearer timeframe controls

### Order ticket refinement

The ticket should feel more decisive and less form-like.

Recommendations:

- separate `read market` information from `place order` controls
- make the buy or sell state visually obvious before quantity input
- reduce the number of micro labels visible at once
- make the primary CTA broader and calmer
- use one compact balance summary block instead of multiple small financial callouts

## Mobile UX Direction

### Current problem

The current mobile market page is readable, but it feels like a stacked desktop screen instead of a mobile-first trading surface.

### Target mobile behavior

- sticky bottom trade bar always visible
- market story stays in the main scroll
- order form opens as a bottom sheet
- order book collapsed by default
- key summary stats visible before any scroll-heavy section

### Mobile hierarchy

1. status and market title
2. YES and NO prices
3. trade CTA bar
4. chart or market summary
5. rules and resolution notes
6. recent trades and order book

### Result

This reduces cognitive load and shortens the path from `I understand the market` to `I can trade`.

## WhatsApp Prompt Recommendations

### Current problem

The prompt is useful but visually behaves like a generic interruption.

### Better direction

Turn it into a branded trust-growth moment:

- tighter copy
- less paragraph text
- one visible benefit list
- stronger visual relationship to market alerts and settlement confidence
- softer modal framing with stronger CTA contrast

### Visual tone

- use green as an accent, not a flood
- make the icon area cleaner and less clip-art-like
- use one benefit card, not multiple competing surfaces
- lower the background dim slightly so the market still feels present behind the modal

## M-Pesa Verification Modal Recommendations

### Strong opportunity

This can become a signature SokoOdds interaction.

The reference screenshots point in the right direction:

- high clarity
- local relevance
- bold confirmation state

### Recommended refinements

- reduce the amount of boxed content inside the modal
- make the primary promise the headline, not the processing state
- use one clear status card for `pending`, `success`, and `error`
- keep the phone number display large and unmistakable
- make the CTA language action-specific such as `Send KES 5 verification` or `Link M-Pesa now`

### Error-state design

Errors should not feel punitive.

Use:

- pale warm red background
- dark text for readability
- one sentence
- one clear next action

## Footer and Lower-Page Experience

### Current problem

The footer is useful but feels detached from the rest of the experience and visually too sparse after the board content.

### Recommendation

Turn the lower page into a softer closing zone:

- more air above the footer
- stronger category grouping
- less empty negative space before footer columns
- one short closing statement about trust or Kenya-first payouts

## Component-Level Recommendations

### Highest-priority components to rethink

- `SiteHeader`
- `MarketSignalStrip`
- `MarketBoard`
- `MarketCard`
- `OrderTicket`
- `WhatsAppPrompt`
- wallet verification modal

### New component ideas

- `FeaturedMarketHero`
- `BreakingRail`
- `CompactTrendList`
- `MobileTradeBar`
- `PremiumStatStrip`
- `SoftStatusBanner`

## Interaction and Motion

### Motion rules

- keep motion slow, small, and intentional
- no bouncing buttons
- use fade and slight lift transitions for cards
- use smooth probability and chart state transitions
- modal entry should feel soft and anchored, not abrupt

### Good motion moments

- homepage hero market transition
- filter chip changes
- market-card hover
- bottom-sheet entry on mobile
- wallet verification state change

## Accessibility and Legibility

### Non-negotiables

- maintain strong text contrast on ivory backgrounds
- do not rely on red and green alone for market meaning
- preserve large tap targets on chips and trade controls
- keep form labels outside placeholders where possible
- ensure premium typography never reduces readability on mobile

## Recommended Design System Shift

Move from:

- grid-heavy
- border-heavy
- uniformly carded
- utility-first visually

Toward:

- calm editorial framing
- selective emphasis
- softer surfaces
- one memorable hero zone
- clearer distinction between story, trust, and trade

## Priority Roadmap

### Phase 1: Visual cleanup

- remove visible page and panel grids
- reduce border density
- introduce improved typography pair
- rebalance spacing and shadows

### Phase 2: Key screen redesign

- homepage hero redesign
- market board hierarchy improvements
- market detail ticket and chart refinement
- mobile sticky trade bar concept

### Phase 3: Signature moments

- WhatsApp prompt redesign
- M-Pesa verification redesign
- refined footer and closing experience

## Final Direction Summary

SokoOdds should not look like a smaller copy of Polymarket, and it should not lean into loud betting-site tropes.

The strongest direction is:

- Polymarket discipline for information architecture
- Claude-style softness and premium card framing
- Kenya-native M-Pesa utility and directness

The single biggest visual win will come from removing the grid-line aesthetic and replacing it with calmer surfaces, stronger typography, and a more deliberate hierarchy between featured content, market action, and trust states.
