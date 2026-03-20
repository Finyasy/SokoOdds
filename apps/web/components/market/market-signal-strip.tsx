"use client";

import Link from "next/link";
import type { Market } from "@/lib/mock-data";
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

export function MarketSignalStrip({ markets }: MarketSignalStripProps) {
  const trendingMarkets = [...markets].sort(byVolumeDesc).slice(0, 3);
  const endingSoonMarkets = [...markets]
    .filter((market) => market.status === "Closing Soon")
    .sort(byClosingAsc)
    .slice(0, 3);

  return (
    <section className="signal-strip" aria-label="Market signals">
      <div className="signal-strip__cluster">
        <div className="signal-strip__cluster-head">
          <span className="signal-strip__label">Trending now</span>
          <span className="signal-strip__caption">Highest volume on the board</span>
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
          <span className="signal-strip__label">Ending soon</span>
          <span className="signal-strip__caption">Markets that need a faster decision</span>
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
