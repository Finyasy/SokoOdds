import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketCard } from "@/components/market/market-card";
import { getMarkets } from "@/lib/market-api";

const filters = ["All", "Politics", "Football", "Economy", "Weather", "Culture"];

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="section-stack landing-feed">
          <div className="markets-feed__header">
            <div>
              <span className="section-kicker">Market board</span>
              <h1>All markets</h1>
            </div>
            <span className="markets-feed__count">{markets.length} active launch contracts</span>
          </div>

          <div className="filter-row filter-row--dense" aria-label="Category filters">
            {filters.map((filter, index) => (
              <button
                key={filter}
                type="button"
                className={`filter-chip${index === 0 ? " filter-chip--active" : ""}`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="card-grid card-grid--glance card-grid--landing">
            {markets.map((market) => (
              <MarketCard key={market.slug} market={market} variant="glance" />
            ))}
          </div>

          <div className="landing-feed__footer">
            <span>Focused launch catalogue for politics, football, economy, weather, and culture.</span>
            <Link href="/markets/nairobi-governor-bill-sign-before-june" className="ghost-button">
              Open sample market
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
