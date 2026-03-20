"use client";

import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import {
  buildDiscoveryHref,
  type DiscoveryCategory,
  type DiscoveryFocus
} from "@/lib/market-discovery";
import { formatClosingLabel, formatKes, formatPercent } from "@/lib/mock-data";

type MarketSignalStripProps = {
  markets: Market[];
};

function byVolumeDesc(a: Market, b: Market) {
  return b.volumeKes - a.volumeKes;
}

function byClosingAsc(a: Market, b: Market) {
  return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
}

function getSignalCategories(markets: Market[]) {
  return [...new Set(markets.map((market) => market.category))].slice(0, 3);
}

function formatSignalBoardLabel(focus: DiscoveryFocus, category: DiscoveryCategory) {
  const categoryLabel = category.toLowerCase();
  return focus === "trending" ? `Trending ${categoryLabel}` : `Ending soon ${categoryLabel}`;
}

export function MarketSignalStrip({ markets }: MarketSignalStripProps) {
  const trendingMarkets = [...markets].sort(byVolumeDesc).slice(0, 3);
  const endingSoonMarkets = [...markets]
    .filter((market) => market.status === "Closing Soon")
    .sort(byClosingAsc)
    .slice(0, 3);
  const trendingCategories = getSignalCategories(trendingMarkets);
  const endingSoonCategories = getSignalCategories(endingSoonMarkets);

  return (
    <section className="signal-strip" aria-label="Market signals">
      <div className="signal-strip__cluster">
        <div className="signal-strip__cluster-head">
          <div className="signal-strip__copy-block">
            <Link
              href={buildDiscoveryHref("/markets", "All", "", "trending")}
              className="signal-strip__label-link"
            >
              <span className="signal-strip__label">Trending now</span>
            </Link>
            <span className="signal-strip__caption">Highest volume on the board</span>
          </div>
          <div className="signal-strip__focuses" aria-label="Trending focus boards">
            {trendingCategories.map((category) => (
              <Link
                key={category}
                href={buildDiscoveryHref("/markets", category, "", "trending")}
                className="signal-strip__focus-link"
              >
                {formatSignalBoardLabel("trending", category)}
              </Link>
            ))}
          </div>
        </div>

        <div className="signal-strip__items">
          {trendingMarkets.map((market) => (
            <Link key={market.slug} href={`/markets/${market.slug}`} className="signal-strip__item">
              <div className="signal-strip__copy">
                <strong>{market.shortLabel}</strong>
                <span>
                  {market.category} • {formatKes(market.volumeKes)} volume
                </span>
              </div>
              <span className="signal-strip__metric">{formatPercent(market.yesPrice)} YES</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="signal-strip__cluster signal-strip__cluster--quiet">
        <div className="signal-strip__cluster-head">
          <div className="signal-strip__copy-block">
            <Link
              href={buildDiscoveryHref("/markets", "All", "", "ending-soon")}
              className="signal-strip__label-link"
            >
              <span className="signal-strip__label">Ending soon</span>
            </Link>
            <span className="signal-strip__caption">Markets that need a faster decision</span>
          </div>
          <div className="signal-strip__focuses" aria-label="Ending soon focus boards">
            {endingSoonCategories.map((category) => (
              <Link
                key={category}
                href={buildDiscoveryHref("/markets", category, "", "ending-soon")}
                className="signal-strip__focus-link"
              >
                {formatSignalBoardLabel("ending-soon", category)}
              </Link>
            ))}
          </div>
        </div>

        <div className="signal-strip__items">
          {endingSoonMarkets.map((market) => (
            <Link key={market.slug} href={`/markets/${market.slug}`} className="signal-strip__item">
              <div className="signal-strip__copy">
                <strong>{market.shortLabel}</strong>
                <span>
                  {market.category} • {formatClosingLabel(market.closesAt)}
                </span>
              </div>
              <span className="signal-strip__metric signal-strip__metric--soft">{market.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
