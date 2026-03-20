import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketCard } from "@/components/market/market-card";
import { getMarkets } from "@/lib/market-api";

const discoveryCategories = ["All", "Politics", "Football", "Economy", "Weather", "Culture"];

export default async function HomePage() {
  const markets = await getMarkets();
  const discoveryMarkets = markets.slice(0, 8);

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="section-stack landing-feed">
          <div className="markets-feed__header">
            <div>
              <span className="section-kicker">Live discovery</span>
              <h1>All markets</h1>
            </div>
            <span className="markets-feed__count">{discoveryMarkets.length} live contracts</span>
          </div>

          <div className="filter-row filter-row--dense">
            {discoveryCategories.map((category) => (
              <Link
                key={category}
                href="/markets"
                className={`filter-chip${category === "All" ? " filter-chip--active" : ""}`}
              >
                {category}
              </Link>
            ))}
          </div>

          <div className="card-grid card-grid--glance card-grid--landing">
            {discoveryMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} variant="glance" />
            ))}
          </div>

          <div className="landing-feed__footer">
            <span>Smaller market set, clearer depth, faster scanning.</span>
            <Link href="/markets" className="ghost-button">
              Show more markets
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
