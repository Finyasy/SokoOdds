import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketCard } from "@/components/market/market-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { TrustCard } from "@/components/ui/trust-card";
import { getHomepageMarketGroups } from "@/lib/market-api";
import { formatKes } from "@/lib/mock-data";

const trustCards = [
  {
    title: "Every market names a resolution source",
    description:
      "Users should never wonder what counts. Resolution source, notes, and edge cases stay visible near the question."
  },
  {
    title: "Available and reserved funds stay separate",
    description:
      "Money-moving flows are explained in plain language so a submitted order never feels like a hidden balance change."
  },
  {
    title: "Built for KES and mobile money realities",
    description:
      "The product is designed around Kenya-first wallet behavior, simple funding language, and mobile-first action flows."
  }
];

export default async function HomePage() {
  const { featuredMarkets, endingSoonMarkets, kenyaPulseMarkets } =
    await getHomepageMarketGroups();

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="hero-panel">
          <div className="hero-panel__copy">
            <span className="hero-panel__eyebrow">Kenya-first event markets</span>
            <h1>Trade what East Africa believes with rules you can actually trust.</h1>
            <p>
              SokoOdds combines a Polymarket-style trading surface, Kalshi-style contract
              discipline, Kenya-native payment clarity, and a calmer Stripe-inspired product feel.
            </p>
            <div className="hero-panel__actions">
              <Link href="/markets" className="primary-button">
                Explore markets
              </Link>
              <Link
                href="/markets/nairobi-governor-bill-sign-before-june"
                className="ghost-button ghost-button--light"
              >
                See a sample market
              </Link>
            </div>
            <div className="hero-panel__metrics">
              <div>
                <span>KES-first wallet view</span>
                <strong>{formatKes(1500000)} scaffold liquidity</strong>
              </div>
              <div>
                <span>Market trust baseline</span>
                <strong>Resolution source on every contract</strong>
              </div>
            </div>
          </div>

          <div className="hero-panel__board">
            {featuredMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} variant="compact" />
            ))}
          </div>
        </section>

        <section className="section-stack">
          <SectionHeading
            eyebrow="Discovery"
            title="Trending now"
            description="Probability-first cards, visible close times, and local categories users recognize without translation."
          />
          <div className="card-grid">
            {featuredMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} />
            ))}
          </div>
        </section>

        <section className="section-stack">
          <SectionHeading
            eyebrow="Urgency"
            title="Ending soon"
            description="The homepage should create momentum without confusing users or hiding the rules."
          />
          <div className="card-grid">
            {endingSoonMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} />
            ))}
          </div>
        </section>

        <section className="section-stack">
          <SectionHeading
            eyebrow="Kenya pulse"
            title="Built around the questions people already debate"
            description="Launch depth matters more than launch breadth. SokoOdds starts where weekly local relevance is strongest."
          />
          <div className="card-grid">
            {kenyaPulseMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} />
            ))}
          </div>
        </section>

        <section className="trust-strip">
          {trustCards.map((card) => (
            <TrustCard key={card.title} title={card.title} description={card.description} />
          ))}
        </section>

        <section className="story-grid">
          <article className="panel">
            <div className="panel__header">
              <span className="market-chip">How it works</span>
              <strong>Simple, not casual</strong>
            </div>
            <ol className="number-list">
              <li>Fund your wallet in KES.</li>
              <li>Buy YES or NO on a clearly-worded market.</li>
              <li>Get paid when the verified outcome settles.</li>
            </ol>
          </article>

          <article className="panel">
            <div className="panel__header">
              <span className="market-chip">Community roadmap</span>
              <strong>Forecasting identity comes next</strong>
            </div>
            <p className="panel-copy">
              The long-term layer is not noise. It is analyst reputation, leaderboards, and
              source-backed reasoning that make the market more informative over time.
            </p>
            <div className="stat-list">
              <div>
                <span>Top analyst this week</span>
                <strong>Nairobi Macro Desk</strong>
              </div>
              <div>
                <span>Best hit rate</span>
                <strong>81%</strong>
              </div>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
