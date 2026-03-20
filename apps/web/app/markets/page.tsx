import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketCard } from "@/components/market/market-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getMarkets } from "@/lib/market-api";

const filters = ["All", "Politics", "Football", "Economy", "Weather", "Culture"];

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow">Markets</span>
          <h1>Browse focused, Kenya-first event markets.</h1>
          <p>
            The discovery layer keeps the signal high: clear wording, visible probability, KES
            volume, and resolution context that stays near the question.
          </p>
        </section>

        <section className="filter-row" aria-label="Category filters">
          {filters.map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={`filter-chip${index === 0 ? " filter-chip--active" : ""}`}
            >
              {filter}
            </button>
          ))}
        </section>

        <section className="section-stack">
          <SectionHeading
            eyebrow="Launch focus"
            title="Fewer markets, better depth"
            description="A small number of liquid, understandable markets beats a long page of thin cards."
          />
          <div className="card-grid">
            {markets.map((market) => (
              <MarketCard key={market.slug} market={market} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
