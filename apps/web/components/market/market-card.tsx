import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import { formatKes, formatPercent } from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";
import { ProbabilityChart } from "./probability-chart";
import { ProbabilityPill } from "./probability-pill";

type MarketCardProps = {
  market: Market;
  variant?: "default" | "compact" | "glance";
};

export function MarketCard({ market, variant = "default" }: MarketCardProps) {
  const title = variant === "glance" ? market.shortLabel : market.question;
  const tone = market.category.toLowerCase();
  const isGlance = variant === "glance";
  const cardMeta =
    isGlance
      ? [
          `${formatKes(market.volumeKes)} vol.`,
          market.status === "Closing Soon" ? "Closing soon" : formatPercent(market.yesPrice)
        ]
      : market.cardMeta?.length
        ? market.cardMeta
        : [`${formatKes(market.volumeKes)} vol.`];
  const boardOptions = market.boardOptions?.slice(0, 2) ?? [];
  const isChartCard = isGlance && market.showMiniChart;
  const cardLayout = isChartCard ? "chart" : "binary";
  const probabilityOptions =
    isGlance && boardOptions.length === 2
      ? [
          { label: boardOptions[0].label, value: boardOptions[0].value, tone: "yes" as const },
          { label: boardOptions[1].label, value: boardOptions[1].value, tone: "no" as const }
        ]
      : [
          { label: "YES", value: market.yesPrice, tone: "yes" as const },
          { label: "NO", value: market.noPrice, tone: "no" as const }
        ];
  const showStatusPill = !isGlance || market.status === "Closing Soon";

  return (
    <Link
      href={`/markets/${market.slug}`}
      className={`market-card market-card--${variant} market-card--tone-${tone} market-card--layout-${cardLayout}`}
    >
      <div className="market-card__hero">
        <div className="market-card__identity">
          <MarketIdentity market={market} size={variant === "glance" ? "sm" : "md"} />
          <div className="market-card__eyebrow">
            <span className="market-chip">{market.category}</span>
            {variant === "glance" ? null : <span className="market-card__region">{market.region}</span>}
          </div>
        </div>
        {showStatusPill ? (
          <span className={`status-pill status-pill--${market.status.toLowerCase().replace(" ", "-")}`}>
            {market.status}
          </span>
        ) : null}
      </div>

      <div className="market-card__body">
        <h3>{title}</h3>
        {variant === "glance" ? null : <p>{market.summary}</p>}
      </div>

      {isChartCard && market.artworkPath ? (
        <div className="market-card__art-strip" aria-hidden="true">
          <img
            src={market.artworkPath}
            alt={market.artworkAlt ?? `${market.shortLabel} artwork`}
            className="market-card__art-image"
          />
        </div>
      ) : null}

      {isChartCard ? (
        <ProbabilityChart history={market.history} value={market.yesPrice} />
      ) : null}

      <div className="market-card__probabilities">
        {probabilityOptions.map((option) => (
          <ProbabilityPill key={option.label} label={option.label} value={option.value} tone={option.tone} />
        ))}
      </div>

      <div className="market-card__stats">
        {cardMeta.map((item) => (
          <div key={item}>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </Link>
  );
}
