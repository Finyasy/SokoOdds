import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import { discoveryCategories, type DiscoveryCategory } from "@/lib/market-discovery";
import { formatClosingLabel } from "@/lib/mock-data";
import { MarketCard } from "./market-card";

type MarketBoardProps = {
  title: string;
  kicker: string;
  countQualifier: string;
  filteredMarkets: Market[];
  activeFilter: DiscoveryCategory;
  searchQuery: string;
  onFilterChange: (filter: DiscoveryCategory) => void;
  onClearDiscovery: () => void;
  footerText: string;
  footerHref: string;
  footerLabel: string;
};

export function MarketBoard({
  title,
  kicker,
  countQualifier,
  filteredMarkets,
  activeFilter,
  searchQuery,
  onFilterChange,
  onClearDiscovery,
  footerText,
  footerHref,
  footerLabel
}: MarketBoardProps) {
  const urgentMarkets = filteredMarkets.filter((market) => market.status === "Closing Soon").slice(0, 3);
  const countLabel = `${filteredMarkets.length} ${countQualifier} contract${
    filteredMarkets.length === 1 ? "" : "s"
  }`;

  return (
    <section className="section-stack landing-feed">
      <div className="markets-feed__header">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h1>{title}</h1>
        </div>
        <span className="markets-feed__count">{countLabel}</span>
      </div>

      <div className="filter-row filter-row--dense" aria-label="Category filters">
        {discoveryCategories.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-chip${activeFilter === filter ? " filter-chip--active" : ""}`}
            aria-pressed={activeFilter === filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {urgentMarkets.length ? (
        <div className="market-rail" aria-label="Ending soon markets">
          <span className="market-rail__label">Ending soon</span>
          <div className="market-rail__items">
            {urgentMarkets.map((market) => (
              <Link key={market.slug} href={`/markets/${market.slug}`} className="market-rail__item">
                <strong>{market.shortLabel}</strong>
                <span>{formatClosingLabel(market.closesAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {filteredMarkets.length ? (
        <div className="card-grid card-grid--glance card-grid--landing" data-testid="market-board-grid">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.slug} market={market} variant="glance" />
          ))}
        </div>
      ) : (
        <div className="market-board-empty" data-testid="market-board-empty">
          <strong>No markets match this search yet.</strong>
          <span>
            {searchQuery.trim()
              ? `Nothing in the current board matches “${searchQuery.trim()}”.`
              : "Try another category or reset the board."}
          </span>
          <button type="button" className="ghost-button" onClick={onClearDiscovery}>
            Show all markets
          </button>
        </div>
      )}

      <div className="landing-feed__footer">
        <span>{footerText}</span>
        <Link href={footerHref} className="ghost-button">
          {footerLabel}
        </Link>
      </div>
    </section>
  );
}
