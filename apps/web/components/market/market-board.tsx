"use client";

import Link from "next/link";
import { useState } from "react";
import type { Market, MarketCategory } from "@/lib/mock-data";
import { formatClosingLabel } from "@/lib/mock-data";
import { MarketCard } from "./market-card";

type MarketBoardProps = {
  title: string;
  kicker: string;
  countLabel: string;
  markets: Market[];
  footerText: string;
  footerHref: string;
  footerLabel: string;
};

const filters: Array<"All" | MarketCategory> = [
  "All",
  "Politics",
  "Football",
  "Economy",
  "Weather",
  "Culture"
];

export function MarketBoard({
  title,
  kicker,
  countLabel,
  markets,
  footerText,
  footerHref,
  footerLabel
}: MarketBoardProps) {
  const [activeFilter, setActiveFilter] = useState<"All" | MarketCategory>("All");

  const filteredMarkets =
    activeFilter === "All" ? markets : markets.filter((market) => market.category === activeFilter);
  const urgentMarkets = filteredMarkets.filter((market) => market.status === "Closing Soon").slice(0, 3);

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
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-chip${activeFilter === filter ? " filter-chip--active" : ""}`}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
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

      <div className="card-grid card-grid--glance card-grid--landing" data-testid="market-board-grid">
        {filteredMarkets.map((market) => (
          <MarketCard key={market.slug} market={market} variant="glance" />
        ))}
      </div>

      <div className="landing-feed__footer">
        <span>{footerText}</span>
        <Link href={footerHref} className="ghost-button">
          {footerLabel}
        </Link>
      </div>
    </section>
  );
}
