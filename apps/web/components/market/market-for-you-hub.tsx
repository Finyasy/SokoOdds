"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { rankMarketsForUser } from "@/lib/market-discovery";
import { formatKes } from "@/lib/mock-data";
import type { Market, MarketCategory } from "@/lib/mock-data";
import { MarketCard } from "./market-card";

const STREAK_STORAGE_KEY = "sokoodds.discovery.streak";

type StoredStreak = {
  count: number;
  lastCheckIn: string | null;
};

function getTodayStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function loadStoredStreak(): StoredStreak {
  if (typeof window === "undefined") {
    return { count: 0, lastCheckIn: null };
  }

  const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
  if (!raw) {
    return { count: 0, lastCheckIn: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredStreak>;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      lastCheckIn: typeof parsed.lastCheckIn === "string" ? parsed.lastCheckIn : null,
    };
  } catch {
    return { count: 0, lastCheckIn: null };
  }
}

function formatInteractionSummary(
  interaction:
    | {
        viewedCount: number;
        pausedCount: number;
        openedCount: number;
      }
    | undefined
) {
  if (!interaction) {
    return null;
  }

  if (interaction.openedCount > 0) {
    return `Opened ${interaction.openedCount}x from feed`;
  }

  if (interaction.pausedCount > 0) {
    return `Paused on ${interaction.pausedCount}x`;
  }

  if (interaction.viewedCount > 0) {
    return `Viewed ${interaction.viewedCount}x`;
  }

  return null;
}

type MarketForYouHubProps = {
  markets: Market[];
};

export function MarketForYouHub({ markets }: MarketForYouHubProps) {
  const {
    state,
    watchlist,
    recentMarketSlugs,
    notificationPreferences,
    feedInteractions,
    isHydrated,
    recordFeedImpression,
    recordFeedPause,
    recordFeedOpen,
    updateNotificationPreference,
  } = useOnboarding();
  const [streak, setStreak] = useState<StoredStreak>(() => loadStoredStreak());
  const seenFeedImpressionsRef = useRef<Set<string>>(new Set());
  const todayStamp = getTodayStamp();
  const hasCheckedInToday = streak.lastCheckIn === todayStamp;

  useEffect(() => {
    if (typeof window === "undefined" || !isHydrated) {
      return;
    }

    window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  }, [isHydrated, streak]);

  const preferredCategories = useMemo<MarketCategory[]>(() => {
    if (state.kycStatus === "approved") {
      return ["Politics", "Football", "Economy"];
    }
    if (state.mpesaVerified) {
      return ["Football", "Culture", "Politics"];
    }
    return ["Football", "Culture", "Weather"];
  }, [state.kycStatus, state.mpesaVerified]);
  const stableWatchlist = useMemo(() => (isHydrated ? watchlist : []), [isHydrated, watchlist]);
  const stableRecentMarketSlugs = useMemo(
    () => (isHydrated ? recentMarketSlugs : []),
    [isHydrated, recentMarketSlugs]
  );
  const stableNotificationPreferences = useMemo(
    () =>
      isHydrated
        ? notificationPreferences
        : {
            dailyPulse: true,
            priceMoves: true,
            resolutionSoon: true,
            newDrops: false
          },
    [isHydrated, notificationPreferences]
  );
  const stableFeedInteractions = useMemo(
    () => (isHydrated ? feedInteractions : {}),
    [feedInteractions, isHydrated]
  );

  const rankedMarkets = useMemo(
    () =>
      rankMarketsForUser(markets, {
        watchlist: stableWatchlist,
        recentMarketSlugs: stableRecentMarketSlugs,
        preferredCategories,
        notificationPreferences: stableNotificationPreferences,
        feedInteractions: stableFeedInteractions
      }),
    [
      markets,
      preferredCategories,
      stableFeedInteractions,
      stableNotificationPreferences,
      stableRecentMarketSlugs,
      stableWatchlist
    ]
  );
  const forYouMarkets = useMemo(() => rankedMarkets.slice(0, 6).map((item) => item.market), [rankedMarkets]);
  const topReasons = useMemo(
    () =>
      rankedMarkets
        .slice(0, 3)
        .flatMap((item) => item.reasons)
        .filter((reason, index, all) => all.indexOf(reason) === index)
        .slice(0, 3),
    [rankedMarkets]
  );
  const leadRecommendation = rankedMarkets[0];
  const swipeMarkets = useMemo(() => rankedMarkets.slice(0, 5), [rankedMarkets]);

  const continueMarkets = useMemo(() => {
    const mapped = stableRecentMarketSlugs
      .map((slug) => markets.find((market) => market.slug === slug))
      .filter((market): market is Market => Boolean(market));
    return mapped.length ? mapped.slice(0, 3) : forYouMarkets.slice(0, 3);
  }, [forYouMarkets, markets, stableRecentMarketSlugs]);
  const watchlistMarkets = useMemo(
    () =>
      stableWatchlist
        .map((slug) => markets.find((market) => market.slug === slug))
        .filter((market): market is Market => Boolean(market))
        .slice(0, 4),
    [markets, stableWatchlist],
  );
  const momentumMarkets = useMemo(
    () => [...rankedMarkets].sort((left, right) => right.market.trades.length - left.market.trades.length).slice(0, 3),
    [rankedMarkets],
  );
  const dailyMissions = useMemo(
    () => [
      {
        label: hasCheckedInToday ? "Daily check-in locked" : "Check in and keep your streak",
        detail: hasCheckedInToday
          ? "Your market habit is active for today."
          : "Open the board, make one call, and keep your rhythm alive.",
        cta: hasCheckedInToday ? "Completed" : "Check in now",
        complete: hasCheckedInToday,
      },
      {
        label: state.mpesaVerified ? "Wallet ready" : "Verify your wallet",
        detail: state.mpesaVerified
          ? "You can move from feed to order ticket without friction."
          : "Get M-Pesa ready so good markets are one tap away.",
        cta: state.mpesaVerified ? "Ready" : "Finish setup",
        complete: state.mpesaVerified,
      },
      {
        label: state.kycStatus === "approved" ? "KYC approved" : "Unlock full trading access",
        detail:
          state.kycStatus === "approved"
            ? "Your account is ready for the full product."
            : "Submit identity details so the app feels complete, not half-open.",
        cta: state.kycStatus === "approved" ? "Unlocked" : "Complete KYC",
        complete: state.kycStatus === "approved",
      },
    ],
    [hasCheckedInToday, state.kycStatus, state.mpesaVerified],
  );
  const handleRecordFeedImpression = useEffectEvent((marketSlug: string) => {
    recordFeedImpression(marketSlug);
  });

  function handleCheckIn() {
    if (hasCheckedInToday) {
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStamp = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterday);

    setStreak((current) => ({
      count: current.lastCheckIn === yesterdayStamp ? current.count + 1 : 1,
      lastCheckIn: todayStamp,
    }));
  }

  useEffect(() => {
    swipeMarkets.slice(0, 2).forEach(({ market }) => {
      if (seenFeedImpressionsRef.current.has(market.slug)) {
        return;
      }

      seenFeedImpressionsRef.current.add(market.slug);
      handleRecordFeedImpression(market.slug);
    });
  }, [swipeMarkets]);

  return (
    <section className="for-you-hub" aria-label="For you market feed" data-testid="for-you-hub">
      <div className="for-you-hub__hero">
        <div>
          <span className="section-kicker">For you</span>
          <h1>{state.name ? `${state.name}, here’s your market rhythm.` : "Your market rhythm starts here."}</h1>
          <p>
            A faster SokoOdds loop for daily check-ins, sharper picks, and markets worth coming
            back for tonight.
          </p>
        </div>
        <div className="for-you-hub__hero-stats">
          <div data-testid="for-you-streak">
            <span>Current streak</span>
            <strong>{streak.count} days</strong>
          </div>
          <div data-testid="for-you-picked-count">
            <span>Picked for you</span>
            <strong>{forYouMarkets.length} markets</strong>
          </div>
          <div data-testid="for-you-cash-ready">
            <span>Cash ready</span>
            <strong>{formatKes(state.walletBalanceKes)}</strong>
          </div>
        </div>
      </div>

      <section className="for-you-card for-you-card--compact" data-testid="for-you-ranking-notes">
        <div className="for-you-card__head">
          <span className="market-chip">Why these markets</span>
          <strong>{leadRecommendation ? leadRecommendation.market.shortLabel : "Personalized picks"}</strong>
        </div>
        <div className="for-you-explainer">
          <div className="for-you-explainer__lead">
            <strong>{leadRecommendation?.market.question ?? "Your feed adapts as you use it."}</strong>
            <span>
              {leadRecommendation?.reasons.join(" · ") ??
                "Visits, saves, urgency, and activity now shape what rises to the top."}
            </span>
          </div>
          <div className="for-you-explainer__chips">
            {topReasons.map((reason) => (
              <span key={reason} className="for-you-explainer__chip">
                {reason}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="for-you-hub__grid">
        <section className="for-you-card for-you-card--mission" data-testid="for-you-missions">
          <div className="for-you-card__head">
            <span className="market-chip">Daily loop</span>
            <strong>{dailyMissions.filter((mission) => mission.complete).length}/3 done</strong>
          </div>
          <div className="for-you-missions">
            {dailyMissions.map((mission) => (
              <article
                key={mission.label}
                className={`for-you-mission${mission.complete ? " for-you-mission--complete" : ""}`}
              >
                <div>
                  <strong>{mission.label}</strong>
                  <span>{mission.detail}</span>
                </div>
                {mission.complete ? (
                  <span className="for-you-mission__badge">{mission.cta}</span>
                ) : mission.label.startsWith("Check in") ? (
                  <button type="button" className="ghost-button" onClick={handleCheckIn}>
                    {mission.cta}
                  </button>
                ) : (
                  <Link href="/portfolio" className="ghost-button">
                    {mission.cta}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="for-you-card">
          <div className="for-you-card__head">
            <span className="market-chip">Continue tonight</span>
            <strong>{stableRecentMarketSlugs.length ? "Resume where you paused" : `${continueMarkets.length} quick picks`}</strong>
          </div>
          <div className="for-you-card__rail">
            {continueMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} variant="glance" />
            ))}
          </div>
        </section>
      </div>

      <section className="for-you-card for-you-card--secondary">
        <div className="for-you-card__head">
          <span className="market-chip">For you now</span>
          <strong>Swipe-worthy board</strong>
        </div>
        <div className="for-you-card__rail for-you-card__rail--wide">
          {forYouMarkets.map((market) => (
            <MarketCard key={market.slug} market={market} variant="glance" />
          ))}
        </div>
      </section>

      <section className="for-you-card for-you-card--swipe" data-testid="for-you-swipe-feed">
        <div className="for-you-card__head">
          <span className="market-chip">Mobile deck</span>
          <strong>Swipe through tonight&apos;s picks</strong>
        </div>
        <div className="for-you-swipe-feed" aria-label="Swipeable mobile market feed">
          {swipeMarkets.map(({ market, reasons }) => (
            <article
              key={market.slug}
              className="for-you-swipe-card"
              onMouseEnter={() => recordFeedPause(market.slug)}
              onTouchStart={() => recordFeedImpression(market.slug)}
            >
              {formatInteractionSummary(feedInteractions[market.slug]) ? (
                <div className="for-you-signal-badges">
                  <span className="for-you-signal-badge">
                    {formatInteractionSummary(feedInteractions[market.slug])}
                  </span>
                </div>
              ) : null}
              <div className="for-you-swipe-card__meta">
                <span className="market-chip">{market.category}</span>
                <strong>{Math.round(market.yesPrice * 100)}% YES</strong>
              </div>
              <div className="for-you-swipe-card__body">
                <h3>{market.question}</h3>
                <p>{reasons[0] ?? `${formatKes(market.volumeKes)} volume and active trading.`}</p>
              </div>
              <div className="for-you-swipe-card__footer">
                <span>
                  {market.trades.length} prints · {formatKes(market.volumeKes)} vol.
                </span>
                <Link
                  href={`/markets/${market.slug}`}
                  className="ghost-button"
                  onClick={() => recordFeedOpen(market.slug)}
                >
                  Open market
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="for-you-vertical-feed" data-testid="for-you-vertical-feed">
        <div className="for-you-vertical-feed__head">
          <span className="market-chip">Full-screen feed</span>
          <strong>Built for one-handed browsing</strong>
        </div>
        <div className="for-you-vertical-feed__stack" aria-label="Full-screen vertical market feed">
          {swipeMarkets.map(({ market, reasons }, index) => (
            <article
              key={`${market.slug}-vertical`}
              className="for-you-vertical-card"
              onMouseEnter={() => recordFeedPause(market.slug)}
              onTouchStart={() => recordFeedImpression(market.slug)}
            >
              {formatInteractionSummary(feedInteractions[market.slug]) ? (
                <div className="for-you-signal-badges">
                  <span className="for-you-signal-badge">
                    {formatInteractionSummary(feedInteractions[market.slug])}
                  </span>
                </div>
              ) : null}
              <div className="for-you-vertical-card__topline">
                <span className="for-you-vertical-card__index">#{index + 1}</span>
                <span className="market-chip">{market.category}</span>
              </div>
              <div className="for-you-vertical-card__body">
                <h3>{market.question}</h3>
                <p>
                  {reasons.join(" · ") || `${formatKes(market.volumeKes)} volume and live trading flow.`}
                </p>
              </div>
              <div className="for-you-vertical-card__prices">
                <span className="for-you-vertical-card__price for-you-vertical-card__price--yes">
                  Yes {Math.round(market.yesPrice * 100)}%
                </span>
                <span className="for-you-vertical-card__price for-you-vertical-card__price--no">
                  No {Math.round(market.noPrice * 100)}%
                </span>
              </div>
              <div className="for-you-vertical-card__meta">
                <span>{market.trades.length} recent prints</span>
                <span>{formatKes(market.volumeKes)} volume</span>
                <span>{market.region}</span>
              </div>
              <div className="for-you-vertical-card__actions">
                <Link
                  href={`/markets/${market.slug}`}
                  className="primary-button primary-button--block"
                  onClick={() => recordFeedOpen(market.slug)}
                >
                  Open market
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="for-you-hub__grid for-you-hub__grid--supporting">
        <section className="for-you-card for-you-card--compact">
          <div className="for-you-card__head">
            <span className="market-chip">Momentum</span>
            <strong>Most active tonight</strong>
          </div>
          <div className="for-you-list">
            {momentumMarkets.map(({ market, reasons }, index) => (
              <Link key={market.slug} href={`/markets/${market.slug}`} className="for-you-list__item">
                <span>{index + 1}</span>
                <div>
                  <strong>{market.shortLabel}</strong>
                  <span>
                    {market.trades.length} recent prints · {formatKes(market.volumeKes)} vol.
                    {reasons[0] ? ` · ${reasons[0]}` : ""}
                  </span>
                </div>
                <em>{Math.round(market.yesPrice * 100)}%</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="for-you-card for-you-card--compact">
          <div className="for-you-card__head">
            <span className="market-chip">Alerts</span>
            <strong>Your cadence</strong>
          </div>
          <div className="for-you-preferences">
            {[
              ["dailyPulse", "Daily pulse"],
              ["priceMoves", "Price moves"],
              ["resolutionSoon", "Resolve soon"],
              ["newDrops", "New drops"],
            ].map(([key, label]) => (
              <label key={key} className="for-you-preference">
                <div>
                  <strong>{label}</strong>
                  <span>Let the app earn the right to interrupt you.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationPreferences[key as keyof typeof notificationPreferences]}
                  onChange={(event) =>
                    updateNotificationPreference(
                      key as keyof typeof notificationPreferences,
                      event.target.checked,
                    )
                  }
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="for-you-card">
        <div className="for-you-card__head">
          <span className="market-chip">Watchlist</span>
          <strong>{watchlistMarkets.length ? `${watchlistMarkets.length} saved markets` : "Start saving markets"}</strong>
        </div>
        {watchlistMarkets.length ? (
          <div className="for-you-card__rail">
            {watchlistMarkets.map((market) => (
              <MarketCard key={market.slug} market={market} variant="glance" />
            ))}
          </div>
        ) : (
          <div className="portfolio-state">
            Save markets from the market page and they will stay close to your nightly routine here.
          </div>
        )}
      </section>

      <div className="for-you-hub__grid">
        <section className="for-you-card for-you-card--compact">
          <div className="for-you-card__head">
            <span className="market-chip">Lifestyle layer</span>
            <strong>Why this should feel daily</strong>
          </div>
          <div className="for-you-copy-list">
            <div>
              <strong>Morning pulse</strong>
              <span>Three markets you should know before the day gets noisy.</span>
            </div>
            <div>
              <strong>Evening recap</strong>
              <span>Come back for what moved, what resolved, and what deserves a fresh call.</span>
            </div>
            <div>
              <strong>One-tap action</strong>
              <span>Wallet, watchlist, and order flow should stay close to every card.</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
