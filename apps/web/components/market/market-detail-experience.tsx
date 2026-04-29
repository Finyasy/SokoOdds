"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import type { Market, MarketComment, TopHolder } from "@/lib/mock-data";
import {
  formatClosingLabel,
  formatPercent,
  formatKes,
} from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";
import { OrderBook } from "./order-book";

type MarketDetailExperienceProps = {
  market: Market;
  relatedMarkets: Market[];
  comments: MarketComment[];
  topHolders: TopHolder[];
};

type DetailTab = "rules" | "context";
type SocialTab = "comments" | "holders" | "positions" | "activity";
type IdentityTone = "amber" | "blue" | "violet" | "green";

function appendComment(
  comments: MarketComment[],
  nextComment: MarketComment,
) {
  if (nextComment.parentCommentId) {
    return comments.map((comment) =>
      comment.id === nextComment.parentCommentId
        ? {
            ...comment,
            replies: [...(comment.replies ?? []), { ...nextComment, replies: nextComment.replies ?? [] }],
          }
        : comment,
    );
  }

  return [{ ...nextComment, replies: nextComment.replies ?? [] }, ...comments];
}

function replaceComment(
  comments: MarketComment[],
  nextComment: MarketComment,
) {
  return comments.map((comment) => {
    if (comment.id === nextComment.id) {
      return {
        ...nextComment,
        replies: comment.replies ?? nextComment.replies ?? [],
      };
    }

    if (comment.replies?.length) {
      return {
        ...comment,
        replies: comment.replies.map((reply) =>
          reply.id === nextComment.id ? { ...nextComment, replies: [] } : reply,
        ),
      };
    }

    return comment;
  });
}

function removeComment(
  comments: MarketComment[],
  commentId: string,
) {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: (comment.replies ?? []).filter((reply) => reply.id !== commentId),
    }));
}

function findComment(
  comments: MarketComment[],
  commentId: string,
) {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment;
    }
    const reply = comment.replies?.find((item) => item.id === commentId);
    if (reply) {
      return reply;
    }
  }

  return null;
}

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

function buildMarketContextCards(market: Market) {
  return [
    {
      id: `${market.id}-context-rules`,
      title: "Additional context",
      body: market.ruleHighlights[0] ?? `Resolution source: ${market.resolutionSource}`,
      updatedLabel: "Live rules"
    },
    {
      id: `${market.id}-context-trust`,
      title: "Why traders care",
      body: market.trustNotes[0] ?? market.summary,
      updatedLabel: "Live note"
    },
    {
      id: `${market.id}-context-source`,
      title: "Resolution source",
      body: market.resolutionSource,
      updatedLabel: "Always visible"
    }
  ];
}

function buildMarketActivity(market: Market) {
  return [
    {
      id: `${market.id}-activity-rule`,
      label: "Rule checkpoint",
      detail: market.ruleHighlights[0] ?? `Source: ${market.resolutionSource}`,
      timeLabel: "Rules live"
    },
    {
      id: `${market.id}-activity-source`,
      label: "Trust note",
      detail: market.trustNotes[0] ?? market.summary,
      timeLabel: "Market context"
    },
    ...market.trades.slice(0, 3).map((trade, index) => ({
      id: `${market.id}-activity-trade-${trade.id}-${index}`,
      label: `${trade.side} print`,
      detail: `${trade.shares} shares at Ksh ${trade.price.toFixed(2)}`,
      timeLabel: trade.time
    }))
  ];
}

export function MarketDetailExperience({
  market,
  relatedMarkets,
  comments,
  topHolders
}: MarketDetailExperienceProps) {
  const {
    state,
    isHydrated,
    watchlist,
    recentMarketSlugs,
    feedInteractions,
    commentThreadFollows,
    portfolioOrders,
    openAccountSheet,
    toggleWatchlist,
    notificationPreferences,
    updateNotificationPreference,
    followCommentThread,
    unfollowCommentThread,
    markCommentThreadSeen,
    recordMarketVisit
  } = useOnboarding();
  const [detailTab, setDetailTab] = useState<DetailTab>("rules");
  const [socialTab, setSocialTab] = useState<SocialTab>("comments");
  const [isOrderBookOpen, setIsOrderBookOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [postingReplyId, setPostingReplyId] = useState<string | null>(null);
  const [marketComments, setMarketComments] = useState<MarketComment[]>(comments);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [hidingCommentId, setHidingCommentId] = useState<string | null>(null);
  const [restoringCommentId, setRestoringCommentId] = useState<string | null>(null);
  const [hiddenReplyIds, setHiddenReplyIds] = useState<string[]>([]);
  const [hiddenReplyMap, setHiddenReplyMap] = useState<Record<string, MarketComment>>({});
  const stableWatchlist = useMemo(() => (isHydrated ? watchlist : []), [isHydrated, watchlist]);
  const stableRecentMarketSlugs = useMemo(
    () => (isHydrated ? recentMarketSlugs : []),
    [isHydrated, recentMarketSlugs],
  );
  const stableFeedInteractions = useMemo(
    () => (isHydrated ? feedInteractions : {}),
    [feedInteractions, isHydrated],
  );
  const stableCommentThreadFollows = useMemo(
    () => (isHydrated ? commentThreadFollows : {}),
    [commentThreadFollows, isHydrated],
  );
  const stableNotificationPreferences = useMemo(
    () =>
      isHydrated
        ? notificationPreferences
        : {
            dailyPulse: true,
            priceMoves: true,
            resolutionSoon: true,
            newDrops: false,
          },
    [isHydrated, notificationPreferences],
  );
  const activePortfolioSnapshot = state.isSignedIn ? portfolioOrders : null;
  const totalCommentCount = useMemo(
    () =>
      marketComments.reduce(
        (sum, comment) => sum + 1 + (comment.replies?.length ?? 0),
        0,
      ),
    [marketComments],
  );
  const threadAlertCount = useMemo(
    () =>
      marketComments.reduce((sum, comment) => {
        const stableThreadState = stableCommentThreadFollows[market.slug]?.[comment.id];
        if (!stableThreadState) {
          return sum;
        }
        return sum + Math.max(0, (comment.replies?.length ?? 0) - stableThreadState.lastSeenReplyCount);
      }, 0),
    [market.slug, marketComments, stableCommentThreadFollows],
  );
  const followedThreads = useMemo(
    () =>
      marketComments
        .filter((comment) => stableCommentThreadFollows[market.slug]?.[comment.id])
        .map((comment) => {
          const threadState = stableCommentThreadFollows[market.slug][comment.id];
          const unreadCount = Math.max(
            0,
            (comment.replies?.length ?? 0) - threadState.lastSeenReplyCount,
          );
          const latestReply = comment.replies?.[comment.replies.length - 1] ?? null;

          return {
            comment,
            unreadCount,
            latestReply,
            autoFollowed: threadState.autoFollowed,
          };
        })
        .sort((left, right) => right.unreadCount - left.unreadCount),
    [market.slug, marketComments, stableCommentThreadFollows],
  );
  const activity = useMemo(() => buildMarketActivity(market), [market]);
  const contextCards = useMemo(() => buildMarketContextCards(market), [market]);
  const isWatchlisted = stableWatchlist.includes(market.slug);
  const livePosition = useMemo(
    () => activePortfolioSnapshot?.positions?.find((position) => position.marketId === market.id) ?? null,
    [activePortfolioSnapshot, market.id]
  );
  const liveExposure = useMemo(
    () => activePortfolioSnapshot?.markets?.find((item) => item.marketId === market.id) ?? null,
    [activePortfolioSnapshot, market.id]
  );
  const relatedMarketSignals = useMemo(
    () =>
      relatedMarkets.map((relatedMarket) => {
        const relatedPosition =
          activePortfolioSnapshot?.positions?.find((position) => position.marketId === relatedMarket.id) ?? null;
        const relatedExposure =
          activePortfolioSnapshot?.markets?.find((item) => item.marketId === relatedMarket.id) ?? null;
        const isRelatedWatchlisted = stableWatchlist.includes(relatedMarket.slug);

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
    [activePortfolioSnapshot, relatedMarkets, stableWatchlist]
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
  const feedSignal = stableFeedInteractions[market.slug];
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

    if (stableRecentMarketSlugs.includes(market.slug)) {
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

    if (stableNotificationPreferences.priceMoves) {
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
    stableNotificationPreferences.priceMoves,
    stableRecentMarketSlugs
  ]);
  const communityStats = [
    { label: "Comments", value: String(totalCommentCount) },
    { label: "Top holders", value: String(topHolders.length) },
    { label: "Watchers", value: `${totalCommentCount * 9 + 14}` },
    { label: "Recent prints", value: String(market.trades.length) }
  ];
  const handleRecordMarketVisit = useEffectEvent((marketSlug: string) => {
    recordMarketVisit(marketSlug);
  });

  useEffect(() => {
    handleRecordMarketVisit(market.slug);
  }, [market.slug]);

  useEffect(() => {
    setMarketComments(comments);
  }, [comments]);

  useEffect(() => {
    setLikedCommentIds([]);
    setLikingCommentId(null);
    setHidingCommentId(null);
    setRestoringCommentId(null);
    setHiddenReplyIds([]);
    setHiddenReplyMap({});
    setActiveReplyId(null);
    setReplyDrafts({});
    setPostingReplyId(null);
  }, [market.slug]);

  async function handlePostComment(parentCommentId?: string) {
    const nextBody = (parentCommentId ? replyDrafts[parentCommentId] : commentDraft).trim();
    if (!nextBody) {
      setCommentError(parentCommentId ? "Write a reply before posting." : "Write a comment before posting.");
      return;
    }

    if (!state.isSignedIn) {
      openAccountSheet();
      return;
    }

    setCommentError(null);
    if (parentCommentId) {
      setPostingReplyId(parentCommentId);
    } else {
      setIsPostingComment(true);
    }

    try {
      const response = await fetch(`/api/markets/${market.slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: nextBody, parentCommentId: parentCommentId ?? null }),
      });
      const payload = (await response.json()) as MarketComment | { error?: string };

      if (!response.ok || !("id" in payload)) {
        setCommentError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not post the comment.",
        );
        return;
      }

      setMarketComments((current) => appendComment(current, payload));
      if (parentCommentId) {
        setReplyDrafts((current) => ({ ...current, [parentCommentId]: "" }));
        setActiveReplyId(null);
        const parentThread = findComment(marketComments, parentCommentId);
        followCommentThread(
          market.slug,
          parentCommentId,
          (parentThread?.replies?.length ?? 0) + 1,
          true,
        );
      } else {
        followCommentThread(market.slug, payload.id, 0, true);
        setCommentDraft("");
      }
    } catch {
      setCommentError(parentCommentId ? "Could not post the reply." : "Could not post the comment.");
    } finally {
      if (parentCommentId) {
        setPostingReplyId(null);
      } else {
        setIsPostingComment(false);
      }
    }
  }

  async function handleLikeComment(commentId: string) {
    if (!state.isSignedIn) {
      openAccountSheet();
      return;
    }

    if (likingCommentId === commentId || likedCommentIds.includes(commentId)) {
      return;
    }

    setCommentError(null);
    setLikingCommentId(commentId);

    try {
      const response = await fetch(`/api/markets/${market.slug}/comments/${commentId}/like`, {
        method: "POST",
      });
      const payload = (await response.json()) as MarketComment | { error?: string };

      if (!response.ok || !("id" in payload)) {
        setCommentError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not like the comment.",
        );
        return;
      }

      setMarketComments((current) => replaceComment(current, payload));
      setLikedCommentIds((current) => [...current, commentId]);
    } catch {
      setCommentError("Could not like the comment.");
    } finally {
      setLikingCommentId(null);
    }
  }

  async function handleHideComment(commentId: string) {
    if (!state.isSignedIn) {
      openAccountSheet();
      return;
    }

    if (!state.isAdmin || hidingCommentId === commentId) {
      return;
    }

    setCommentError(null);
    setHidingCommentId(commentId);
    const existingComment = findComment(marketComments, commentId);

    try {
      const response = await fetch(`/api/markets/${market.slug}/comments/${commentId}/hide`, {
        method: "POST",
      });
      const payload = (await response.json()) as MarketComment | { error?: string };

      if (!response.ok || !("id" in payload)) {
        setCommentError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not hide the comment.",
        );
        return;
      }

      if (existingComment?.parentCommentId) {
        setHiddenReplyMap((current) =>
          existingComment ? { ...current, [commentId]: existingComment } : current,
        );
        setHiddenReplyIds((current) => (current.includes(commentId) ? current : [...current, commentId]));
      } else {
        setMarketComments((current) => removeComment(current, commentId));
      }
      setLikedCommentIds((current) => current.filter((id) => id !== commentId));
    } catch {
      setCommentError("Could not hide the comment.");
    } finally {
      setHidingCommentId(null);
    }
  }

  async function handleRestoreComment(commentId: string) {
    if (!state.isSignedIn) {
      openAccountSheet();
      return;
    }

    if (!state.isAdmin || restoringCommentId === commentId) {
      return;
    }

    setCommentError(null);
    setRestoringCommentId(commentId);

    try {
      const response = await fetch(`/api/markets/${market.slug}/comments/${commentId}/restore`, {
        method: "POST",
      });
      const payload = (await response.json()) as MarketComment | { error?: string };

      if (!response.ok || !("id" in payload)) {
        setCommentError(
          "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Could not restore the comment.",
        );
        return;
      }

      setHiddenReplyIds((current) => current.filter((id) => id !== commentId));
    } catch {
      setCommentError("Could not restore the comment.");
    } finally {
      setRestoringCommentId(null);
    }
  }

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
              Comments ({totalCommentCount})
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
              {threadAlertCount > 0 ? (
                <div className="comment-thread-alert" data-testid="comment-thread-alert">
                  <strong>{threadAlertCount} new thread update{threadAlertCount === 1 ? "" : "s"}</strong>
                  <span>Tracked replies landed in threads you chose to follow.</span>
                </div>
              ) : null}
              {followedThreads.length ? (
                <div className="comment-follow-rail" data-testid="comment-follow-rail">
                  <div className="comment-follow-rail__head">
                    <strong>Followed threads</strong>
                    <span>{followedThreads.length} active</span>
                  </div>
                  <div className="comment-follow-rail__list">
                    {followedThreads.map(({ comment, unreadCount, latestReply, autoFollowed }) => (
                      <article key={comment.id} className="comment-follow-chip">
                        <div>
                          <strong>{comment.author}</strong>
                          <p>{comment.body}</p>
                          <span>
                            {unreadCount > 0
                              ? `${unreadCount} unread repl${unreadCount === 1 ? "y" : "ies"}`
                              : autoFollowed
                                ? "Auto-following because you posted here"
                                : "Up to date"}
                            {latestReply ? ` · Latest by ${latestReply.author}` : ""}
                          </span>
                        </div>
                        <div className="comment-follow-chip__actions">
                          <button
                            type="button"
                            className="comment-card__action"
                            onClick={() => {
                              document
                                .getElementById(`comment-thread-${comment.id}`)
                                ?.scrollIntoView({ behavior: "smooth", block: "center" });
                              if (unreadCount > 0) {
                                markCommentThreadSeen(
                                  market.slug,
                                  comment.id,
                                  comment.replies?.length ?? 0,
                                );
                              }
                            }}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            className="comment-card__action"
                            onClick={() => {
                              markCommentThreadSeen(
                                market.slug,
                                comment.id,
                                comment.replies?.length ?? 0,
                              );
                            }}
                          >
                            Catch up
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="comment-compose">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder={state.isSignedIn ? "Add a comment..." : "Sign in to join the discussion"}
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handlePostComment()}
                  disabled={isPostingComment}
                >
                  Post
                </button>
              </div>
              {commentError ? (
                <p className="portfolio-inline-note portfolio-inline-note--danger" role="alert">
                  {commentError}
                </p>
              ) : null}
              <div className="comment-toolbar" aria-hidden="true">
                <span className="comment-toolbar__filter comment-toolbar__filter--active">Newest</span>
                <span className="comment-toolbar__filter">Holders</span>
                <span className="comment-toolbar__notice">External links are reviewed before posting.</span>
              </div>
              <div className="comment-list">
                {marketComments.length ? (
                  marketComments.map((comment) => (
                    <article key={comment.id} id={`comment-thread-${comment.id}`} className="comment-card">
                      <div className={`comment-card__avatar ${getCommentAvatarTone(comment.author)}`}>
                        {getCommentInitials(comment.author)}
                      </div>
                      <div className="comment-card__body">
                        <div className="comment-card__head">
                          <strong>{comment.author}</strong>
                          <span>{comment.ageLabel}</span>
                        </div>
                        <p>{comment.body}</p>
                        <div className="comment-card__meta-row">
                          <span className="comment-card__meta">{comment.likes} likes</span>
                          <div className="comment-card__actions">
                            <button
                              type="button"
                              className={`comment-card__action${
                                likedCommentIds.includes(comment.id) ? " comment-card__action--active" : ""
                              }`}
                              onClick={() => void handleLikeComment(comment.id)}
                              disabled={likingCommentId === comment.id}
                            >
                              {likedCommentIds.includes(comment.id) ? "Liked" : "Like"}
                            </button>
                            <button
                              type="button"
                              className={`comment-card__action${
                                activeReplyId === comment.id ? " comment-card__action--active" : ""
                              }`}
                              onClick={() => {
                                setActiveReplyId((current) => (current === comment.id ? null : comment.id));
                                setCommentError(null);
                              }}
                            >
                              Reply
                            </button>
                            {stableCommentThreadFollows[market.slug]?.[comment.id] ? (
                              <button
                                type="button"
                                className="comment-card__action"
                                onClick={() => {
                                  unfollowCommentThread(market.slug, comment.id);
                                }}
                              >
                                Unfollow
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="comment-card__action"
                                onClick={() => {
                                  followCommentThread(
                                    market.slug,
                                    comment.id,
                                    comment.replies?.length ?? 0,
                                  );
                                }}
                              >
                                Follow thread
                              </button>
                            )}
                            {state.isAdmin ? (
                              <button
                                type="button"
                                className="comment-card__action comment-card__action--danger"
                                onClick={() => void handleHideComment(comment.id)}
                                disabled={hidingCommentId === comment.id}
                              >
                                {hidingCommentId === comment.id ? "Hiding..." : "Hide"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {stableCommentThreadFollows[market.slug]?.[comment.id] ? (
                          <div className="comment-thread-meta">
                            <span>
                              {stableCommentThreadFollows[market.slug][comment.id].autoFollowed
                                ? "Following because you posted here"
                                : "Thread alerts on"}
                            </span>
                            {(comment.replies?.length ?? 0) >
                            stableCommentThreadFollows[market.slug][comment.id].lastSeenReplyCount ? (
                              <button
                                type="button"
                                className="comment-card__action"
                                onClick={() => {
                                  markCommentThreadSeen(
                                    market.slug,
                                    comment.id,
                                    comment.replies?.length ?? 0,
                                  );
                                }}
                              >
                                Mark caught up
                              </button>
                            ) : (
                              <span>Up to date</span>
                            )}
                          </div>
                        ) : null}
                        {activeReplyId === comment.id ? (
                          <div className="comment-reply-compose">
                            <input
                              type="text"
                              value={replyDrafts[comment.id] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value;
                                setReplyDrafts((current) => ({ ...current, [comment.id]: value }));
                              }}
                              placeholder={state.isSignedIn ? "Write a reply..." : "Sign in to reply"}
                            />
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => void handlePostComment(comment.id)}
                              disabled={postingReplyId === comment.id}
                            >
                              {postingReplyId === comment.id ? "Posting..." : "Reply"}
                            </button>
                          </div>
                        ) : null}
                        {comment.replies?.length ? (
                          <div className="comment-reply-list">
                            {comment.replies.map((reply) => (
                              hiddenReplyIds.includes(reply.id) ? (
                                <article
                                  key={reply.id}
                                  className="comment-card comment-card--reply comment-card--moderated"
                                  data-testid={`comment-reply-moderated-${reply.id}`}
                                >
                                  <div className="comment-card__body">
                                    <div className="comment-card__head">
                                      <strong>Reply hidden</strong>
                                      <span>{hiddenReplyMap[reply.id]?.ageLabel ?? reply.ageLabel}</span>
                                    </div>
                                    <p>Only admins can see this reply was moderated inline from the thread.</p>
                                    <div className="comment-card__meta-row">
                                      <span className="comment-card__meta">Hidden for readers on this page</span>
                                      <div className="comment-card__actions">
                                        <button
                                          type="button"
                                          className="comment-card__action"
                                          onClick={() => void handleRestoreComment(reply.id)}
                                          disabled={restoringCommentId === reply.id}
                                        >
                                          {restoringCommentId === reply.id ? "Restoring..." : "Restore reply"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              ) : (
                                <article key={reply.id} className="comment-card comment-card--reply">
                                  <div className={`comment-card__avatar ${getCommentAvatarTone(reply.author)}`}>
                                    {getCommentInitials(reply.author)}
                                  </div>
                                  <div className="comment-card__body">
                                    <div className="comment-card__head">
                                      <strong>{reply.author}</strong>
                                      <span>{reply.ageLabel}</span>
                                    </div>
                                    <p>{reply.body}</p>
                                    <div className="comment-card__meta-row">
                                      <span className="comment-card__meta">{reply.likes} likes</span>
                                      <div className="comment-card__actions">
                                        <button
                                          type="button"
                                          className={`comment-card__action${
                                            likedCommentIds.includes(reply.id) ? " comment-card__action--active" : ""
                                          }`}
                                          onClick={() => void handleLikeComment(reply.id)}
                                          disabled={likingCommentId === reply.id}
                                        >
                                          {likedCommentIds.includes(reply.id) ? "Liked" : "Like"}
                                        </button>
                                        {state.isAdmin ? (
                                          <button
                                            type="button"
                                            className="comment-card__action comment-card__action--danger"
                                            onClick={() => void handleHideComment(reply.id)}
                                            disabled={hidingCommentId === reply.id}
                                          >
                                            {hidingCommentId === reply.id ? "Hiding..." : "Hide reply"}
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              )
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="portfolio-state">
                    No comments yet. Be the first to leave a market note.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {socialTab === "holders" ? (
            topHolders.length ? (
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
            ) : (
              <div className="portfolio-state">
                No public holder summary yet. This market will show top participants once durable
                positions build up.
              </div>
            )
          ) : null}

          {socialTab === "positions" ? (
            <div className="data-list" data-testid="market-detail-positions">
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
          <div className="market-personalization-list" data-testid="market-detail-personalization">
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
