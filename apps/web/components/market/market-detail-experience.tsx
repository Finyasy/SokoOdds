"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Market } from "@/lib/mock-data";
import {
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
  const [detailTab, setDetailTab] = useState<DetailTab>("rules");
  const [socialTab, setSocialTab] = useState<SocialTab>("comments");
  const [isOrderBookOpen, setIsOrderBookOpen] = useState(false);
  const comments = useMemo(() => getMarketComments(market), [market]);
  const topHolders = useMemo(() => getMarketTopHolders(market), [market]);
  const activity = useMemo(() => getMarketActivity(market), [market]);
  const contextCards = useMemo(() => getMarketContextCards(market), [market]);

  return (
    <section className="market-detail-layout">
      <div className="market-detail-layout__main">
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
                  <strong>Your sample position</strong>
                  <span>YES 120 shares</span>
                </div>
                <div>
                  <strong>{formatKes(7440)}</strong>
                  <span>Mark value</span>
                </div>
              </div>
              <div className="data-list__row">
                <div>
                  <strong>Available balance</strong>
                  <span>{formatKes(0)}</span>
                </div>
                <div>
                  <strong className="positive-text">+{formatKes(120)}</strong>
                  <span>Unrealized P&amp;L</span>
                </div>
              </div>
            </div>
          ) : null}

          {socialTab === "activity" ? (
            <div className="data-list">
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
            {relatedMarkets.map((relatedMarket) => (
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
                  <span>YES</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
