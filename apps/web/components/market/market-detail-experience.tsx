"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchPortfolioOrders,
  type PortfolioOrdersResponse
} from "@/lib/account-client";
import type { Market } from "@/lib/mock-data";
import {
  formatClosingLabel,
  formatPercent,
  formatKes,
  getMarketActivity,
  getMarketComments,
  getMarketContextCards,
  getMarketTopHolders
} from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";
import { OrderBook } from "./order-book";

type MarketDetailExperienceProps = {
  market: Market;
  relatedMarkets: Market[];
};

type DetailTab = "rules" | "context";
type SocialTab = "comments" | "holders" | "positions" | "activity";
type IdentityTone = "amber" | "blue" | "violet" | "green";

function getCommentInitials(author: string) {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function pickTone(seed: string): IdentityTone {
  const tones: IdentityTone[] = ["amber", "blue", "violet", "green"];
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

function getCommentAvatarTone(author: string) {
  return `comment-card__avatar--${pickTone(author)}`;
}

function getIdentityInitials(label: string) {
  return label
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MiniIdentity({
  label,
  className = ""
}: {
  label: string;
  className?: string;
}) {
  const tone = pickTone(label);

  return (
    <span className={`mini-identity mini-identity--${tone}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {getIdentityInitials(label)}
    </span>
  );
}

export function MarketDetailExperience({
  market,
  relatedMarkets
}: MarketDetailExperienceProps) {
  const {
    state,
    watchlist,
    recentMarketSlugs,
    feedInteractions,
    toggleWatchlist,
    notificationPreferences,
    updateNotificationPreference,
    recordMarketVisit
  } = useOnboarding();
  const [detailTab, setDetailTab] = useState<DetailTab>("rules");
  const [socialTab, setSocialTab] = useState<SocialTab>("comments");
  const [isOrderBookOpen, setIsOrderBookOpen] = useState(false);
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioOrdersResponse | null>(null);
  const activePortfolioSnapshot = state.isSignedIn ? portfolioSnapshot : null;
  const comments = useMemo(() => getMarketComments(market), [market]);
  const topHolders = useMemo(() => getMarketTopHolders(market), [market]);
  const activity = useMemo(() => getMarketActivity(market), [market]);
  const contextCards = useMemo(() => getMarketContextCards(market), [market]);
  const isWatchlisted = watchlist.includes(market.slug);
  const livePosition = useMemo(
    () => activePortfolioSnapshot?.positions.find((position) => position.marketId === market.id) ?? null,
    [activePortfolioSnapshot, market.id]
  );
  const liveExposure = useMemo(
    () => activePortfolioSnapshot?.markets.find((item) => item.marketId === market.id) ?? null,
    [activePortfolioSnapshot, market.id]
  );
  const relatedMarketSignals = useMemo(
    () =>
      relatedMarkets.map((relatedMarket) => {
        const relatedPosition =
          activePortfolioSnapshot?.positions.find((position) => position.marketId === relatedMarket.id) ?? null;
        const relatedExposure =
          activePortfolioSnapshot?.markets.find((item) => item.marketId === relatedMarket.id) ?? null;
        const isRelatedWatchlisted = watchlist.includes(relatedMarket.slug);

        return {
          market: relatedMarket,
          signalLabel: relatedPosition
            ? `${relatedPosition.side} live`
            : relatedExposure
              ? `${relatedExposure.activeOrderCount} orders live`
              : isRelatedWatchlisted
                ? "Saved"
                : null,
          signalDetail: relatedPosition
            ? `${relatedPosition.shares} shares · Ksh ${relatedPosition.marketValueKes}`
            : relatedExposure
              ? `Ksh ${relatedExposure.reservedAmountKes} reserved`
              : isRelatedWatchlisted
                ? "On your watchlist"
                : `${formatKes(relatedMarket.volumeKes)} vol.`,
        };
      }),
    [activePortfolioSnapshot, relatedMarkets, watchlist]
  );
  const activityFeed = useMemo(
    () =>
      market.trades.slice(0, 3).map((trade) => ({
        id: `print-${trade.id}`,
        label: `${trade.side} filled`,
        detail: `${trade.shares} shares at ${trade.price.toFixed(2)} KES`,
        timeLabel: trade.time
      })),
    [market]
  );
  const feedSignal = feedInteractions[market.slug];
  const surfacedReasons = useMemo(() => {
    const items: Array<{ label: string; detail: string }> = [];

    if (livePosition) {
      items.push({
        label: `Holding ${livePosition.side} ${livePosition.shares} shares`,
        detail: "You already have live exposure here, so the market stays close for position review."
      });
    } else if (liveExposure) {
      items.push({
        label: `${liveExposure.activeOrderCount} live orders here`,
        detail: "Open orders keep this market elevated until you get a clearer outcome."
      });
    }

    if (feedSignal?.openedCount) {
      items.push({
        label: `Opened ${feedSignal.openedCount}x from feed`,
        detail: "This market keeps earning a closer look from your discovery flow."
      });
    }

    if (feedSignal?.pausedCount) {
      items.push({
        label: `Paused on ${feedSignal.pausedCount}x`,
        detail: "You lingered here longer than usual, so it ranks as a stronger signal."
      });
    }

    if (recentMarketSlugs.includes(market.slug)) {
      items.push({
        label: "Part of your recent run",
        detail: "You viewed this recently, so it stays near the top while the story is moving."
      });
    }

    if (isWatchlisted) {
      items.push({
        label: "Saved to watchlist",
        detail: "Watchlisted markets stay surfaced so you can re-enter quickly."
      });
    }

    if (notificationPreferences.priceMoves) {
      items.push({
        label: "Price alerts enabled",
        detail: "This market is connected to your alert preferences for move-based follow-up."
      });
    }

    if (!items.length) {
      items.push({
        label: "High fit for your board",
        detail: "It is trending near your categories and momentum signals right now."
      });
    }

    return items.slice(0, 4);
  }, [
    feedSignal,
    isWatchlisted,
    liveExposure,
    livePosition,
    market.slug,
    notificationPreferences.priceMoves,
    recentMarketSlugs
  ]);
  const communityStats = [
    { label: "Comments", value: String(comments.length) },
    { label: "Top holders", value: String(topHolders.length) },
    { label: "Watchers", value: `${comments.length * 9 + 14}` },
    { label: "Recent prints", value: String(market.trades.length) }
  ];
  const handleRecordMarketVisit = useEffectEvent((marketSlug: string) => {
    recordMarketVisit(marketSlug);
  });

  useEffect(() => {
    handleRecordMarketVisit(market.slug);
  }, [market.slug]);

  useEffect(() => {
    if (!state.isSignedIn) {
      return;
    }

    let cancelled = false;

    async function loadPortfolioSnapshot() {
      try {
        const nextSnapshot = await fetchPortfolioOrders();
        if (!cancelled) {
          setPortfolioSnapshot(nextSnapshot);
        }
      } catch {
        if (!cancelled) {
          setPortfolioSnapshot(null);
        }
      }
    }

    void loadPortfolioSnapshot();

    return () => {
      cancelled = true;
    };
  }, [state.isSignedIn, state.phone]);

  return (
    <section className="market-detail-layout">
      <div className="market-detail-layout__main">
        <section className="market-section-card market-section-card--watch-actions">
          <div className="market-section-card__head">
            <div>
              <span className="section-kicker">Keep this close</span>
              <h3>Watch and continue later</h3>
            </div>
            <div className="market-detail-actions">
              <button
                type="button"
                className={isWatchlisted ? "primary-button" : "ghost-button"}
                onClick={() => toggleWatchlist(market.slug)}
              >
                {isWatchlisted ? "Saved to watchlist" : "Save to watchlist"}
              </button>
              <label className="market-detail-alert-toggle">
                <input
                  type="checkbox"
                  checked={notificationPreferences.priceMoves}
                  onChange={(event) => updateNotificationPreference("priceMoves", event.target.checked)}
                />
                <span>Price alerts</span>
              </label>
            </div>
          </div>
        </section>

        <section className="market-section-card market-section-card--accordion">
          <button
            type="button"
            className="market-section-card__head market-section-card__head--button"
            onClick={() => setIsOrderBookOpen((current) => !current)}
          >
            <div>
              <span className="section-kicker">Order flow</span>
              <h3>Order book</h3>
            </div>
            <span className="market-section-card__toggle">{isOrderBookOpen ? "Hide" : "Show"}</span>
          </button>
          {isOrderBookOpen ? (
            <OrderBook
              yesBids={market.orderBook.yesBids}
              noBids={market.orderBook.noBids}
              trades={market.trades}
              showHeader={false}
              compact
            />
          ) : null}
        </section>

        <section className="market-tab-shell">
          <div className="market-tab-row" aria-label="Market detail tabs">
            <button
              type="button"
              className={`market-tab${detailTab === "rules" ? " market-tab--active" : ""}`}
              onClick={() => setDetailTab("rules")}
            >
              Rules
            </button>
            <button
              type="button"
              className={`market-tab${detailTab === "context" ? " market-tab--active" : ""}`}
              onClick={() => setDetailTab("context")}
            >
              Market context
            </button>
          </div>

          {detailTab === "rules" ? (
            <div className="market-context-stack">
              {contextCards.map((card) => (
                <article key={card.id} className="context-card">
                  <div className="context-card__head">
                    <strong>{card.title}</strong>
                    <span>{card.updatedLabel}</span>
                  </div>
                  <p>{card.body}</p>
                </article>
              ))}
              <p className="market-long-copy">
                This market resolves <strong>YES</strong> only if the named source confirms the
                condition before the deadline. Otherwise it resolves <strong>NO</strong>. Drafts,
                rumors, and unofficial screenshots do not count.
              </p>
              <div className="market-rule-list">
                {market.ruleHighlights.map((item) => (
                  <div key={item} className="market-rule-list__item">
                    <span className="market-rule-list__bullet" aria-hidden="true" />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="market-context-stack">
              <article className="context-card">
                <div className="context-card__head">
                  <strong>What traders are watching</strong>
                  <span>Live note</span>
                </div>
                <p>{market.trustNotes[0]}</p>
              </article>
              <article className="context-card">
                <div className="context-card__head">
                  <strong>Source discipline</strong>
                  <span>Always visible</span>
                </div>
                <p>Resolution source: {market.resolutionSource}</p>
              </article>
              <article className="context-card">
                <div className="context-card__head">
                  <strong>Market pulse</strong>
                  <span>What matters now</span>
                </div>
                <div className="market-pulse-grid">
                  <div>
                    <span>YES</span>
                    <strong>{formatPercent(market.yesPrice)}</strong>
                  </div>
                  <div>
                    <span>NO</span>
                    <strong>{formatPercent(market.noPrice)}</strong>
                  </div>
                  <div>
                    <span>Volume</span>
                    <strong>{formatKes(market.volumeKes)}</strong>
                  </div>
                  <div>
                    <span>Liquidity</span>
                    <strong>{formatKes(market.liquidityKes)}</strong>
                  </div>
                </div>
              </article>
            </div>
          )}
        </section>

        <section className="market-tab-shell">
          <div className="market-tab-row" aria-label="Market community tabs">
            <button
              type="button"
              className={`market-tab${socialTab === "comments" ? " market-tab--active" : ""}`}
              onClick={() => setSocialTab("comments")}
            >
              Comments ({comments.length})
            </button>
            <button
              type="button"
              className={`market-tab${socialTab === "holders" ? " market-tab--active" : ""}`}
              onClick={() => setSocialTab("holders")}
            >
              Top holders
            </button>
            <button
              type="button"
              className={`market-tab${socialTab === "positions" ? " market-tab--active" : ""}`}
              onClick={() => setSocialTab("positions")}
            >
              Positions
            </button>
            <button
              type="button"
              className={`market-tab${socialTab === "activity" ? " market-tab--active" : ""}`}
              onClick={() => setSocialTab("activity")}
            >
              Activity
            </button>
          </div>

          {socialTab === "comments" ? (
            <div className="comment-shell">
              <div className="comment-compose">
                <input type="text" value="" readOnly placeholder="Add a comment..." />
                <button type="button" className="primary-button">
                  Post
                </button>
              </div>
              <div className="comment-toolbar" aria-hidden="true">
                <span className="comment-toolbar__filter comment-toolbar__filter--active">Newest</span>
                <span className="comment-toolbar__filter">Holders</span>
                <span className="comment-toolbar__notice">External links are reviewed before posting.</span>
              </div>
              <div className="comment-list">
                {comments.map((comment) => (
                  <article key={comment.id} className="comment-card">
                    <div className={`comment-card__avatar ${getCommentAvatarTone(comment.author)}`}>
                      {getCommentInitials(comment.author)}
                    </div>
                    <div className="comment-card__body">
                      <div className="comment-card__head">
                        <strong>{comment.author}</strong>
                        <span>{comment.ageLabel}</span>
                      </div>
                      <p>{comment.body}</p>
                      <span className="comment-card__meta">{comment.likes} likes</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {socialTab === "holders" ? (
            <div className="data-list">
              {topHolders.map((holder) => (
                <div key={holder.id} className="data-list__row">
                  <div className="data-list__identity-block">
                    <MiniIdentity label={holder.name} />
                    <div>
                      <strong>{holder.name}</strong>
                      <span>{holder.shares} shares</span>
                    </div>
                  </div>
                  <div>
                    <strong className={`trade-side trade-side--${holder.side.toLowerCase()}`}>
                      {holder.side}
                    </strong>
                    <span>{holder.avgPrice} KES avg</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {socialTab === "positions" ? (
            <div className="data-list">
              <div className="data-list__row">
                <div>
                  <strong>Your position</strong>
                  <span>
                    {livePosition
                      ? `${livePosition.side} ${livePosition.shares} shares live`
                      : "No live position yet"}
                  </span>
                </div>
                <div>
                  <strong>{livePosition ? `Ksh ${livePosition.marketValueKes}` : formatKes(0)}</strong>
                  <span>Mark value</span>
                </div>
              </div>
              <div className="data-list__row">
                <div>
                  <strong>Available balance</strong>
                  <span>{formatKes(state.walletBalanceKes)}</span>
                </div>
                <div>
                  <strong
                    className={
                      livePosition
                        ? livePosition.unrealizedPnlKes.startsWith("-")
                          ? "negative-text"
                          : "positive-text"
                        : undefined
                    }
                  >
                    {livePosition
                      ? `${livePosition.unrealizedPnlKes.startsWith("-") ? "" : "+"}Ksh ${livePosition.unrealizedPnlKes}`
                      : formatKes(0)}
                  </strong>
                  <span>Unrealized P&amp;L</span>
                </div>
              </div>
              <div className="data-list__row">
                <div>
                  <strong>{liveExposure ? "Live orders" : "Reserved funds"}</strong>
                  <span>
                    {liveExposure
                      ? `${liveExposure.activeOrderCount} orders · Ksh ${liveExposure.reservedAmountKes}`
                      : formatKes(state.reservedBalanceKes)}
                  </span>
                </div>
                <div>
                  <strong>
                    {livePosition
                      ? `Ksh ${livePosition.averageEntryPriceKes}`
                      : formatClosingLabel(market.closesAt)}
                  </strong>
                  <span>{livePosition ? "Avg entry" : "Market close"}</span>
                </div>
              </div>
            </div>
          ) : null}

          {socialTab === "activity" ? (
            <div className="data-list">
              {activityFeed.map((item) => (
                <div key={item.id} className="data-list__row">
                  <div className="data-list__identity-block">
                    <MiniIdentity label={item.label} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                  <div>
                    <span>{item.timeLabel}</span>
                  </div>
                </div>
              ))}
              {activity.map((item) => (
                <div key={item.id} className="data-list__row">
                  <div className="data-list__identity-block">
                    <MiniIdentity label={item.label} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                  <div>
                    <span>{item.timeLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <aside className="market-detail-layout__aside">
        <section className="panel panel--compact">
          <div className="panel__header">
            <span className="market-chip">Community</span>
            <strong>Market pulse</strong>
          </div>
          <div className="market-pulse-grid market-pulse-grid--aside">
            {communityStats.map((stat) => (
              <div key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div className="market-signal-list">
            <div className="market-signal-list__item">
              <span>Sentiment</span>
              <strong>{market.yesPrice >= 0.5 ? "Leaning YES" : "Leaning NO"}</strong>
            </div>
            <div className="market-signal-list__item">
              <span>Last print</span>
              <strong>{market.trades[0]?.time ?? "Live"}</strong>
            </div>
            <div className="market-signal-list__item">
              <span>Resolution</span>
              <strong>{formatClosingLabel(market.closesAt)}</strong>
            </div>
          </div>
        </section>

        <section className="panel panel--compact">
          <div className="panel__header">
            <span className="market-chip">For you</span>
            <strong>Why this surfaced</strong>
          </div>
          <div className="market-personalization-list">
            {surfacedReasons.map((item) => (
              <article key={item.label} className="market-personalization-item">
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </article>
            ))}
          </div>
          <div className="market-personalization-actions">
            <Link href="/portfolio" className="ghost-button">
              View portfolio signals
            </Link>
            <Link href="/markets" className="primary-button">
              Keep browsing
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="market-chip">Wallet</span>
            <strong>Trade access</strong>
          </div>
          <div className="data-list">
            <div className="data-list__row">
              <div className="data-list__identity-block">
                <MiniIdentity label="M-Pesa" className="mini-identity--brand" />
                <div>
                  <strong>M-Pesa deposit</strong>
                  <span>STK push from your verified number.</span>
                </div>
              </div>
            </div>
            <div className="data-list__row">
              <div className="data-list__identity-block">
                <MiniIdentity label="Paybill" className="mini-identity--brand" />
                <div>
                  <strong>Paybill fallback</strong>
                  <span>Manual funding for larger top-ups.</span>
                </div>
              </div>
            </div>
            <div className="data-list__row">
              <div className="data-list__identity-block">
                <MiniIdentity label="Reserved funds" className="mini-identity--brand" />
                <div>
                  <strong>Reserved funds</strong>
                  <span>Open orders hold cash until filled or cancelled.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <span className="market-chip">Related</span>
            <strong>More to watch</strong>
          </div>
          <div className="related-market-list">
            {relatedMarketSignals.map(({ market: relatedMarket, signalLabel, signalDetail }) => (
              <Link
                key={relatedMarket.slug}
                href={`/markets/${relatedMarket.slug}`}
                className="related-market-item"
              >
                <div className="related-market-item__identity">
                  <MarketIdentity market={relatedMarket} size="sm" />
                  <div>
                    <strong>{relatedMarket.shortLabel}</strong>
                    <span>
                      {relatedMarket.category} · {relatedMarket.region}
                    </span>
                  </div>
                </div>
                <div className="related-market-item__meta">
                  <strong>{formatPercent(relatedMarket.yesPrice)}</strong>
                  {signalLabel ? (
                    <span className="related-market-item__signal">{signalLabel}</span>
                  ) : null}
                  <span>{signalDetail}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
