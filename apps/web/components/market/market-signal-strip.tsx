"use client";

import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import { type DiscoveryCategory, type DiscoveryFocus } from "@/lib/market-discovery";
import { formatClosingLabel, formatKes, formatPercent } from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";

type MarketSignalStripProps = {
  markets: Market[];
  activeCategory: DiscoveryCategory;
  activeFocus: DiscoveryFocus;
  onSelectSignalBoard: (focus: DiscoveryFocus, category: DiscoveryCategory) => void;
  tone?: "home" | "catalog";
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

function isActiveSignalBoard(
  activeFocus: DiscoveryFocus,
  activeCategory: DiscoveryCategory,
  focus: DiscoveryFocus,
  category: DiscoveryCategory
) {
  return activeFocus === focus && activeCategory === category;
}

export function MarketSignalStrip({
  markets,
  activeCategory,
  activeFocus,
  onSelectSignalBoard,
  tone = "home"
}: MarketSignalStripProps) {
  const trendingMarkets = [...markets].sort(byVolumeDesc).slice(0, 3);
  const endingSoonMarkets = [...markets]
    .filter((market) => market.status === "Closing Soon")
    .sort(byClosingAsc)
    .slice(0, 3);
  const trendingCategories = getSignalCategories(trendingMarkets);
  const endingSoonCategories = getSignalCategories(endingSoonMarkets);

  return (
    <section
      className={`signal-strip${tone === "catalog" ? " signal-strip--catalog" : ""}`}
      aria-label="Market signals"
    >
      <div className={`signal-strip__cluster${tone === "catalog" ? " signal-strip__cluster--catalog" : ""}`}>
        <div className="signal-strip__cluster-head">
          <div className="signal-strip__copy-block">
            <button
              type="button"
              className={`signal-strip__label-link${
                isActiveSignalBoard(activeFocus, activeCategory, "trending", "All")
                  ? " signal-strip__label-link--active"
                  : ""
              }`}
              aria-pressed={isActiveSignalBoard(activeFocus, activeCategory, "trending", "All")}
              onClick={() => onSelectSignalBoard("trending", "All")}
            >
              <span className="signal-strip__label">Trending now</span>
            </button>
            <span className="signal-strip__caption">Highest volume on the board</span>
          </div>
          <div className="signal-strip__focuses" aria-label="Trending focus boards">
            {trendingCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`signal-strip__focus-link${
                  isActiveSignalBoard(activeFocus, activeCategory, "trending", category)
                    ? " signal-strip__focus-link--active"
                    : ""
                }`}
                aria-pressed={isActiveSignalBoard(activeFocus, activeCategory, "trending", category)}
                onClick={() => onSelectSignalBoard("trending", category)}
              >
                {formatSignalBoardLabel("trending", category)}
              </button>
            ))}
          </div>
        </div>

        <div className="signal-strip__items">
          {trendingMarkets.map((market) => (
            <Link key={market.slug} href={`/markets/${market.slug}`} className="signal-strip__item">
              <MarketIdentity market={market} size="sm" />
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

      <div
        className={`signal-strip__cluster signal-strip__cluster--quiet${
          tone === "catalog" ? " signal-strip__cluster--catalog" : ""
        }`}
      >
        <div className="signal-strip__cluster-head">
          <div className="signal-strip__copy-block">
            <button
              type="button"
              className={`signal-strip__label-link${
                isActiveSignalBoard(activeFocus, activeCategory, "ending-soon", "All")
                  ? " signal-strip__label-link--active"
                  : ""
              }`}
              aria-pressed={isActiveSignalBoard(activeFocus, activeCategory, "ending-soon", "All")}
              onClick={() => onSelectSignalBoard("ending-soon", "All")}
            >
              <span className="signal-strip__label">Ending soon</span>
            </button>
            <span className="signal-strip__caption">Markets that need a faster decision</span>
          </div>
          <div className="signal-strip__focuses" aria-label="Ending soon focus boards">
            {endingSoonCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={`signal-strip__focus-link${
                  isActiveSignalBoard(activeFocus, activeCategory, "ending-soon", category)
                    ? " signal-strip__focus-link--active"
                    : ""
                }`}
                aria-pressed={isActiveSignalBoard(
                  activeFocus,
                  activeCategory,
                  "ending-soon",
                  category
                )}
                onClick={() => onSelectSignalBoard("ending-soon", category)}
              >
                {formatSignalBoardLabel("ending-soon", category)}
              </button>
            ))}
          </div>
        </div>

        <div className="signal-strip__items">
          {endingSoonMarkets.map((market) => (
            <Link key={market.slug} href={`/markets/${market.slug}`} className="signal-strip__item">
              <MarketIdentity market={market} size="sm" />
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
