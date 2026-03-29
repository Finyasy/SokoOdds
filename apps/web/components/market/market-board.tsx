import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import {
  discoveryCategories,
  formatDiscoveryBoardScope,
  formatDiscoveryFocusLabel,
  type DiscoveryCategory,
  type DiscoveryFocus
} from "@/lib/market-discovery";
import { formatClosingLabel } from "@/lib/mock-data";
import { MarketCard } from "./market-card";

type MarketBoardProps = {
  title: string;
  kicker: string;
  countQualifier: string;
  filteredMarkets: Market[];
  activeFilter: DiscoveryCategory;
  activeFocus: DiscoveryFocus;
  searchQuery: string;
  isTransitioning: boolean;
  onFilterChange: (filter: DiscoveryCategory) => void;
  onClearDiscovery: () => void;
  footerText: string;
  footerHref: string;
  footerLabel: string;
  showMoreHref?: string;
  showMoreLabel?: string;
  showUrgentRail?: boolean;
  showBoardOverview?: boolean;
};

export function MarketBoard({
  title,
  kicker,
  countQualifier,
  filteredMarkets,
  activeFilter,
  activeFocus,
  searchQuery,
  isTransitioning,
  onFilterChange,
  onClearDiscovery,
  footerText,
  footerHref,
  footerLabel,
  showMoreHref,
  showMoreLabel,
  showUrgentRail = true,
  showBoardOverview = false
}: MarketBoardProps) {
  const urgentMarkets = filteredMarkets.filter((market) => market.status === "Closing Soon").slice(0, 3);
  const openMarkets = filteredMarkets.filter((market) => market.status === "Open").length;
  const countLabel = `${filteredMarkets.length} ${countQualifier} contract${
    filteredMarkets.length === 1 ? "" : "s"
  }`;
  const hasActiveFocus = activeFocus !== "all";
  const focusLabel = `${formatDiscoveryFocusLabel(activeFocus)} ${
    activeFilter === "All" ? "markets" : activeFilter.toLowerCase()
  }`;
  const boardScope = formatDiscoveryBoardScope(activeFilter, activeFocus);
  const trimmedSearchQuery = searchQuery.trim();
  const leadMarket = filteredMarkets[0];

  return (
    <section
      className="section-stack landing-feed"
      data-transitioning={isTransitioning ? "true" : "false"}
      aria-busy={isTransitioning}
    >
      <div className="markets-feed__header">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h1>{title}</h1>
        </div>
        <span className="markets-feed__count">{countLabel}</span>
      </div>

      {showBoardOverview && leadMarket ? (
        <div className="catalog-overview">
          <div className="catalog-overview__lead">
            <span className="catalog-overview__label">Board scope</span>
            <strong>{boardScope}</strong>
            <p>
              Lead contract: <strong>{leadMarket.shortLabel}</strong>,{" "}
              <strong>{Math.round(leadMarket.yesPrice * 100)}%</strong> YES.
            </p>
          </div>
          <div className="catalog-overview__stats">
            <div>
              <span>Open</span>
              <strong>{openMarkets}</strong>
            </div>
            <div>
              <span>Closing soon</span>
              <strong>{urgentMarkets.length}</strong>
            </div>
            <div>
              <span>Active filter</span>
              <strong>{activeFilter}</strong>
            </div>
          </div>
        </div>
      ) : null}

      {hasActiveFocus ? (
        <div className="market-board-focus" data-testid="market-board-focus">
          <div className="market-board-focus__copy">
            <span className="market-board-focus__label">Focus</span>
            <strong>{focusLabel}</strong>
          </div>
          <button type="button" className="ghost-button" onClick={onClearDiscovery}>
            Show all markets
          </button>
        </div>
      ) : null}

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

      {showUrgentRail && urgentMarkets.length ? (
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
          <strong>
            {trimmedSearchQuery
              ? `No matching contracts in ${boardScope}.`
              : `No live contracts in ${boardScope} yet.`}
          </strong>
          <span>
            {trimmedSearchQuery
              ? `Nothing in ${boardScope} matches “${trimmedSearchQuery}”. Try another term or reset the board.`
              : `Try another category or reset the board to bring back the broader market feed.`}
          </span>
          <button type="button" className="ghost-button" onClick={onClearDiscovery}>
            Show all markets
          </button>
        </div>
      )}

      {showMoreHref && showMoreLabel && filteredMarkets.length ? (
        <div className="market-board__show-more">
          <Link href={showMoreHref} className="ghost-button ghost-button--centered">
            {showMoreLabel}
          </Link>
        </div>
      ) : null}

      <div className="landing-feed__footer">
        <span>{footerText}</span>
        <Link href={footerHref} className="ghost-button">
          {footerLabel}
        </Link>
      </div>
    </section>
  );
}
