import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import { formatClosingLabel, formatKes } from "@/lib/mock-data";
import { ProbabilityPill } from "./probability-pill";

type MarketCardProps = {
  market: Market;
  variant?: "default" | "compact" | "glance";
};

export function MarketCard({ market, variant = "default" }: MarketCardProps) {
  const title = variant === "glance" ? market.shortLabel : market.question;
  const tone = market.category.toLowerCase();
  const categoryMonogram = {
    Politics: "PO",
    Football: "FK",
    Economy: "EC",
    Weather: "WE",
    Culture: "CU"
  }[market.category];

  return (
    <Link
      href={`/markets/${market.slug}`}
      className={`market-card market-card--${variant} market-card--tone-${tone}`}
    >
      <div className="market-card__hero">
        <div className="market-card__identity">
          <span className="market-card__avatar" aria-hidden="true">
            {categoryMonogram}
          </span>
          <div className="market-card__eyebrow">
            <span className="market-chip">{market.category}</span>
            <span className="market-card__region">{market.region}</span>
          </div>
        </div>
        <span className={`status-pill status-pill--${market.status.toLowerCase().replace(" ", "-")}`}>
          {market.status}
        </span>
      </div>

      <div className="market-card__body">
        <h3>{title}</h3>
        <p>{market.summary}</p>
      </div>

      <div className="market-card__probabilities">
        <ProbabilityPill label="YES" value={market.yesPrice} />
        <ProbabilityPill label="NO" value={market.noPrice} tone="no" />
      </div>

      <div className="market-card__stats">
        <div>
          <span>Volume</span>
          <strong>{formatKes(market.volumeKes)}</strong>
        </div>
        <div>
          <span>Closes</span>
          <strong>{formatClosingLabel(market.closesAt)}</strong>
        </div>
      </div>
    </Link>
  );
}
