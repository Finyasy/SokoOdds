import Image from "next/image";
import Link from "next/link";
import type { Market } from "@/lib/mock-data";
import { formatKes, formatPercent } from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h10a1 1 0 0 1 1 1v13.5l-5.5-3.5L5 17.5V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

type MarketCardProps = {
  market: Market;
  variant?: "default" | "compact" | "glance";
};

export function MarketCard({ market, variant = "default" }: MarketCardProps) {
  const title = variant === "glance" ? market.shortLabel : market.question;
  const tone = market.category.toLowerCase();
  const isGlance = variant === "glance";
  const boardOptions = market.boardOptions?.slice(0, 2) ?? [];
  const showArtworkCard = isGlance && Boolean(market.artworkPath);
  const cardLayout = showArtworkCard ? "feature" : "binary";
  const rows =
    isGlance && boardOptions.length
      ? boardOptions.slice(0, 2).map((opt) => ({
          label: opt.label,
          percent: Math.round(opt.value * 100)
        }))
      : [
          { label: market.boardOptions?.[0]?.label ?? market.question, percent: Math.round(market.yesPrice * 100) },
          ...(market.boardOptions?.[1] ? [{ label: market.boardOptions[1].label, percent: Math.round(market.boardOptions[1].value * 100) }] : [])
        ];
  const frequency = market.cardMeta?.find((m) => m.includes("Daily") || m.includes("Weekly") || m.includes("Monthly")) ?? "";

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
        {market.status === "Closing Soon" ? (
          <span className="status-pill status-pill--closing-soon">Closing soon</span>
        ) : null}
      </div>

      <div className="market-card__body">
        <h3>{title}</h3>
      </div>

      {showArtworkCard && market.artworkPath ? (
        <div className="market-card__art-strip" aria-hidden="true">
          <Image
            src={market.artworkPath}
            alt={market.artworkAlt ?? `${market.shortLabel} artwork`}
            className="market-card__art-image"
            fill
            sizes="(max-width: 760px) 100vw, 33vw"
          />
        </div>
      ) : null}

      {rows.map((row, index) => (
        <div key={row.label} className="market-card__row">
          <span className="market-card__row-label">{row.label}</span>
          <span className="market-card__row-percent">{row.percent}%</span>
          <div className="market-card__row-actions" onClick={(e) => e.preventDefault()}>
            <span className="market-card__yes-btn">Yes</span>
            <span className="market-card__no-btn">No</span>
          </div>
        </div>
      ))}

      <div className="market-card__footer">
        <span className="market-card__volume">
          <strong>{formatKes(market.volumeKes)} Vol.</strong>
          {frequency ? <span>{frequency}</span> : null}
        </span>
        <span className="market-card__bookmark" aria-label="Bookmark market" onClick={(e) => e.preventDefault()}>
          <BookmarkIcon />
        </span>
      </div>
    </Link>
  );
}
