"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchPortfolioOrders,
  fetchMyKycProfile,
  fetchWalletTransactions,
  type KycSubmissionResponse,
  type PortfolioOrdersResponse,
  type WalletTransactionItem,
} from "@/lib/account-client";
import { formatKes, getMarketBySlug } from "@/lib/mock-data";

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatKycTone(status: string) {
  if (status === "approved") {
    return "ready";
  }
  if (status === "pending") {
    return "pending";
  }
  if (status === "rejected") {
    return "danger";
  }
  return "quiet";
}

function formatFeedSignalSummary(input: {
  viewedCount: number;
  pausedCount: number;
  openedCount: number;
}) {
  const parts: string[] = [];

  if (input.openedCount > 0) {
    parts.push(`opened ${input.openedCount}x`);
  }
  if (input.pausedCount > 0) {
    parts.push(`paused ${input.pausedCount}x`);
  }
  if (input.viewedCount > 0) {
    parts.push(`viewed ${input.viewedCount}x`);
  }

  return parts.join(" · ");
}

function formatAlertTone(priority: number) {
  if (priority >= 170) {
    return "high";
  }
  if (priority >= 100) {
    return "medium";
  }
  return "low";
}

type PortfolioSnapshot = {
  items: WalletTransactionItem[];
  kyc: KycSubmissionResponse | null;
  orders: PortfolioOrdersResponse | null;
};

export function PortfolioExperience() {
  const {
    state,
    feedInteractions,
    isHydrated,
    isSyncingAccount,
    openAccountSheet,
    openVerificationSheet,
  } = useOnboarding();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>({
    items: [],
    kyc: null,
    orders: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isSignedIn) {
      setSnapshot({ items: [], kyc: null, orders: null });
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadPortfolio() {
      setIsLoading(true);
      setError(null);

      try {
        const [transactions, kyc, orders] = await Promise.all([
          fetchWalletTransactions(),
          fetchMyKycProfile(),
          fetchPortfolioOrders(),
        ]);

        if (cancelled) {
          return;
        }

        setSnapshot({
          items: transactions.items,
          kyc,
          orders,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the account overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [state.isSignedIn, state.phone]);

  const latestActivity = useMemo(() => snapshot.items.slice(0, 8), [snapshot.items]);
  const orderItems = useMemo(() => snapshot.orders?.items ?? [], [snapshot.orders]);
  const positions = useMemo(() => snapshot.orders?.positions ?? [], [snapshot.orders]);
  const marketExposure = useMemo(() => snapshot.orders?.markets ?? [], [snapshot.orders]);
  const recentFills = useMemo(() => snapshot.orders?.fills ?? [], [snapshot.orders]);
  const recentPrints = useMemo(() => snapshot.orders?.recentPrints ?? [], [snapshot.orders]);
  const topFeedSignals = useMemo(() => {
    const marketLabels = new Map<string, { label: string; detail: string }>();

    [...positions, ...marketExposure, ...orderItems].forEach((item) => {
      if (item.marketSlug) {
        marketLabels.set(item.marketSlug, {
          label: item.marketLabel,
          detail: item.marketQuestion ?? item.marketLabel,
        });
      }
    });

    return Object.entries(feedInteractions)
      .map(([marketSlug, interaction]) => {
        const persisted = marketLabels.get(marketSlug);
        const fallbackMarket = getMarketBySlug(marketSlug);
        const signalScore =
          interaction.openedCount * 90 + interaction.pausedCount * 45 + interaction.viewedCount * 18;
        const exposureMatch = marketExposure.find((market) => market.marketSlug === marketSlug);
        const positionMatch = positions.find((position) => position.marketSlug === marketSlug);

        return {
          marketSlug,
          label: persisted?.label ?? fallbackMarket?.shortLabel ?? marketSlug.replace(/-/g, " "),
          detail:
            persisted?.detail ??
            fallbackMarket?.question ??
            "Durable feed signal imported from your discovery behavior.",
          summary: formatFeedSignalSummary(interaction),
          lastInteractedAt: interaction.lastInteractedAt,
          signalScore,
          statusLabel: positionMatch
            ? `${positionMatch.side} position live`
            : exposureMatch
              ? `${exposureMatch.activeOrderCount} live orders`
              : "Watching from feed",
          actionHref: `/markets/${marketSlug}`,
          actionLabel: positionMatch
            ? "Open position market"
            : exposureMatch
              ? "Open order market"
              : "Open market",
          secondaryHref: positionMatch
            ? "/portfolio#portfolio-positions"
            : exposureMatch
              ? "/portfolio#portfolio-open-orders"
              : "/markets",
          secondaryLabel: positionMatch
            ? "View positions"
            : exposureMatch
              ? "View orders"
              : "Browse more",
        };
      })
      .sort((left, right) => right.signalScore - left.signalScore)
      .slice(0, 4);
  }, [feedInteractions, marketExposure, orderItems, positions]);
  const portfolioAlerts = useMemo(() => {
    return Object.entries(feedInteractions)
      .map(([marketSlug, interaction]) => {
        const positionMatch = positions.find((position) => position.marketSlug === marketSlug);
        const exposureMatch = marketExposure.find((market) => market.marketSlug === marketSlug);
        const latestPrint = recentPrints.find((printItem) => printItem.marketSlug === marketSlug);
        const fallbackMarket = getMarketBySlug(marketSlug);
        const label =
          positionMatch?.marketLabel ??
          exposureMatch?.marketLabel ??
          latestPrint?.marketLabel ??
          fallbackMarket?.shortLabel ??
          marketSlug.replace(/-/g, " ");
        const signalSummary = formatFeedSignalSummary(interaction);
        const detail =
          positionMatch
            ? `${positionMatch.side} ${positionMatch.shares} shares live · P&L ${positionMatch.unrealizedPnlKes.startsWith("-") ? "" : "+"}${positionMatch.unrealizedPnlKes}`
            : exposureMatch
              ? `${exposureMatch.activeOrderCount} live orders · reserved Ksh ${exposureMatch.reservedAmountKes}`
              : latestPrint
                ? `${latestPrint.side} trading at Ksh ${latestPrint.priceKes} · ${latestPrint.timeLabel}`
                : "Strong repeat interest from your feed behavior.";

        if (positionMatch) {
          return {
            marketSlug,
            label,
            detail,
            message: `You keep revisiting this market and already hold a live ${positionMatch.side} position.`,
            actionLabel: "Review position",
            actionHref: positionMatch.marketSlug
              ? `/markets/${positionMatch.marketSlug}`
              : "/portfolio#portfolio-positions",
            secondaryHref: "/portfolio#portfolio-positions",
            secondaryLabel: "Jump to positions",
            signalSummary,
            lastInteractedAt: interaction.lastInteractedAt,
            priority: interaction.openedCount * 95 + interaction.pausedCount * 40 + 40,
          };
        }

        if (exposureMatch) {
          return {
            marketSlug,
            label,
            detail,
            message: `This market still has live order exposure and keeps pulling you back from the feed.`,
            actionLabel: "Check orders",
            actionHref: exposureMatch.marketSlug
              ? `/markets/${exposureMatch.marketSlug}`
              : "/portfolio#portfolio-open-orders",
            secondaryHref: "/portfolio#portfolio-open-orders",
            secondaryLabel: "Jump to open orders",
            signalSummary,
            lastInteractedAt: interaction.lastInteractedAt,
            priority: interaction.openedCount * 85 + interaction.pausedCount * 45 + 28,
          };
        }

        if (interaction.openedCount >= 2 || interaction.pausedCount >= 2) {
          return {
            marketSlug,
            label,
            detail,
            message: "High curiosity with no exposure yet. Worth a fresh read before the next move.",
            actionLabel: "Revisit market",
            actionHref: `/markets/${marketSlug}`,
            secondaryHref: "/markets",
            secondaryLabel: "Browse all markets",
            signalSummary,
            lastInteractedAt: interaction.lastInteractedAt,
            priority: interaction.openedCount * 70 + interaction.pausedCount * 38 + interaction.viewedCount * 12,
          };
        }

        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        tone: formatAlertTone(item.priority),
      }));
  }, [feedInteractions, marketExposure, positions, recentPrints]);

  if (!isHydrated || isSyncingAccount) {
    return (
      <section className="portfolio-shell">
        <div className="portfolio-hero">
          <div>
            <span className="section-kicker">Account overview</span>
            <h1>Loading your wallet and KYC status</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isSignedIn) {
    return (
      <section
        className="portfolio-shell portfolio-shell--signin"
        data-testid="portfolio-signin-required"
      >
        <div className="portfolio-hero portfolio-hero--compact">
          <div>
            <span className="section-kicker">Portfolio</span>
            <h1>Sign in to see your wallet, KYC, and payout history.</h1>
            <p>
              Keep deposits, withdrawals, and market-ready balance in one calm support surface.
            </p>
            <div className="portfolio-signin-proof" aria-label="Portfolio highlights">
              <div>
                <strong>Wallet snapshot</strong>
                <span>Available cash, reserved funds, and recent activity in one glance.</span>
              </div>
              <div>
                <strong>Verification clarity</strong>
                <span>KYC and M-Pesa readiness stay visible before you place or exit trades.</span>
              </div>
            </div>
          </div>
          <div className="portfolio-actions">
            <button type="button" className="primary-button" onClick={openAccountSheet}>
              Sign in to continue
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="portfolio-shell" data-testid="portfolio-overview">
      <div className="portfolio-hero">
        <div>
          <span className="section-kicker">Portfolio</span>
          <h1>{state.name ? `${state.name}'s wallet and activity` : "Wallet and activity"}</h1>
          <p>
            Review cash, open positions, fills, KYC readiness, and recent M-Pesa movement without
            leaving the product.
          </p>
        </div>
        <div className="portfolio-actions">
          <button type="button" className="ghost-button" onClick={openVerificationSheet}>
            Manage wallet setup
          </button>
          <button type="button" className="primary-button" onClick={openVerificationSheet}>
            Deposit or withdraw
          </button>
        </div>
      </div>

      <div className="portfolio-grid portfolio-grid--top">
        <section className="portfolio-card portfolio-card--summary portfolio-card--hero">
          <div className="portfolio-card__head">
            <span className="market-chip">Wallet</span>
            <strong data-testid="portfolio-phone">{state.phone}</strong>
          </div>
          <div className="portfolio-stats">
            <div>
              <span>Available cash</span>
              <strong data-testid="portfolio-available-balance">
                {formatKes(state.walletBalanceKes)}
              </strong>
            </div>
            <div>
              <span>Reserved funds</span>
              <strong data-testid="portfolio-reserved-balance">
                {formatKes(state.reservedBalanceKes)}
              </strong>
            </div>
            <div>
              <span>M-Pesa status</span>
              <strong>{state.mpesaVerified ? "Ready" : "Needs verification"}</strong>
            </div>
            <div>
              <span>KYC status</span>
              <strong>{state.kycStatus.replace(/_/g, " ")}</strong>
            </div>
          </div>
        </section>

        <section className="portfolio-card portfolio-card--compliance">
          <div className="portfolio-card__head">
            <span className="market-chip">Compliance</span>
            <strong>KYC progress</strong>
          </div>
          <div className={`portfolio-status portfolio-status--${formatKycTone(state.kycStatus)}`}>
            <strong>{state.kycStatus === "approved" ? "KYC approved" : `KYC ${state.kycStatus.replace(/_/g, " ")}`}</strong>
            <span>
              {snapshot.kyc?.profile.legalName
                ? snapshot.kyc.profile.legalName
                : "No identity profile on file yet."}
            </span>
          </div>
          <div className="portfolio-detail-list">
            <div>
              <span>Document</span>
              <strong>{snapshot.kyc?.profile.documentType ?? "Not submitted"}</strong>
            </div>
            <div>
              <span>Last update</span>
              <strong>
                {snapshot.kyc?.profile.reviewedAt
                  ? formatDateLabel(snapshot.kyc.profile.reviewedAt)
                  : snapshot.kyc?.profile.submittedAt
                    ? formatDateLabel(snapshot.kyc.profile.submittedAt)
                    : "Waiting for submission"}
              </strong>
            </div>
          </div>
          {snapshot.kyc?.profile.rejectionReason ? (
            <p className="portfolio-inline-note portfolio-inline-note--danger">
              {snapshot.kyc.profile.rejectionReason}
            </p>
          ) : null}
        </section>
      </div>

      <section
        id="portfolio-open-orders"
        className="portfolio-card portfolio-card--spotlight"
      >
        <div className="portfolio-card__head">
          <span className="market-chip">Open orders</span>
          <strong data-testid="portfolio-open-order-count">
            {snapshot.orders?.exposure.openOrderCount ?? 0} live
          </strong>
        </div>

        <div className="portfolio-stats">
          <div>
            <span>Reserved on orders</span>
            <strong data-testid="portfolio-reserved-order-value">
              {snapshot.orders
                ? `Ksh ${snapshot.orders.exposure.reservedOrderValueKes}`
                : formatKes(0)}
            </strong>
          </div>
          <div>
            <span>Latest order state</span>
            <strong>
              {orderItems[0]?.status.replace(/_/g, " ") ?? "No orders yet"}
            </strong>
          </div>
        </div>

        {orderItems.length ? (
          <div className="portfolio-order-list" data-testid="portfolio-orders">
            {orderItems.slice(0, 6).map((item, index) => (
              <article
                key={item.id}
                className={`portfolio-order-item${index === 0 ? " portfolio-order-item--primary" : ""}`}
              >
                <div>
                  <strong>{item.marketLabel}</strong>
                  <span>
                    {item.direction} {item.side} · {item.quantity} shares at Ksh {item.price}
                  </span>
                </div>
                <div className="portfolio-order-item__amount">
                  <strong>Ksh {item.reservedAmountKes}</strong>
                  <span className={`portfolio-activity-item__status portfolio-activity-item__status--${item.status}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="portfolio-state">
            Place your first order from a market ticket and it will appear here with reserved
            exposure.
          </div>
        )}
      </section>

      <section className="portfolio-card portfolio-card--alerts">
        <div className="portfolio-card__head">
          <span className="market-chip">Portfolio alerts</span>
          <strong data-testid="portfolio-alert-count">{portfolioAlerts.length} cues</strong>
        </div>

        {portfolioAlerts.length ? (
          <div className="portfolio-alert-list" data-testid="portfolio-alerts">
            {portfolioAlerts.map((alert) => (
              <article
                key={alert.marketSlug}
                className={`portfolio-alert-item portfolio-alert-item--${alert.tone}`}
              >
                <div className="portfolio-alert-item__head">
                  <strong>{alert.label}</strong>
                  <span>{alert.actionLabel}</span>
                </div>
                <p>{alert.message}</p>
                <div className="portfolio-alert-item__meta">
                  <span>{alert.detail}</span>
                  <span>{alert.signalSummary}</span>
                  {alert.lastInteractedAt ? (
                    <span>Last active {formatDateLabel(alert.lastInteractedAt)}</span>
                  ) : null}
                </div>
                <div className="portfolio-alert-item__actions">
                  <Link href={alert.actionHref} className="primary-button">
                    {alert.actionLabel}
                  </Link>
                  <Link href={alert.secondaryHref} className="ghost-button">
                    {alert.secondaryLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="portfolio-state">
            Once you browse and trade a few markets, this alert rail will start calling out the
            ones worth revisiting.
          </div>
        )}
      </section>

      <div className="portfolio-grid">
        <section
          id="portfolio-positions"
          className={`portfolio-card${positions.length ? "" : " portfolio-card--mobile-empty"}`}
        >
          <div className="portfolio-card__head">
            <span className="market-chip">Positions</span>
            <strong data-testid="portfolio-position-count">
              {positions.length} markets
            </strong>
          </div>

          {positions.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-positions">
              {positions.map((position) => (
                <article
                  key={`${position.marketId}-${position.side}`}
                  className="portfolio-exposure-item"
                >
                  <div>
                    <strong>{position.marketLabel}</strong>
                    <span>
                      {position.side} · {position.shares} shares · avg Ksh{" "}
                      {position.averageEntryPriceKes}
                    </span>
                  </div>
                  <div className="portfolio-order-item__amount">
                    <strong>Ksh {position.marketValueKes}</strong>
                    <span>
                      P&amp;L {position.unrealizedPnlKes.startsWith("-") ? "" : "+"}
                      {position.unrealizedPnlKes}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portfolio-state">
              Filled shares will turn into market positions here once execution records land.
            </div>
          )}
        </section>

        <section className="portfolio-card">
          <div className="portfolio-card__head">
            <span className="market-chip">Market exposure</span>
            <strong data-testid="portfolio-market-exposure-count">
              {marketExposure.length} markets
            </strong>
          </div>

          {marketExposure.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-market-exposure">
              {marketExposure.map((market) => (
                <article key={market.marketId} className="portfolio-exposure-item">
                  <div>
                    <strong>{market.marketLabel}</strong>
                    <span>
                      {market.activeOrderCount} live orders · {market.totalQuantity} shares · avg Ksh{" "}
                      {market.averageEntryPriceKes}
                    </span>
                  </div>
                  <div className="portfolio-order-item__amount">
                    <strong>Ksh {market.reservedAmountKes}</strong>
                    <span>
                      YES {market.latestYesPriceKes} · NO {market.latestNoPriceKes}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portfolio-state">
              Active market exposure will appear here once you place an order from a market ticket.
            </div>
          )}
        </section>
      </div>

      <div className="portfolio-grid">
        <section className="portfolio-card">
          <div className="portfolio-card__head">
            <span className="market-chip">Recent fills</span>
            <strong data-testid="portfolio-fill-count">
              {recentFills.length} fills
            </strong>
          </div>

          {recentFills.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-fills">
              {recentFills.map((fill) => (
                <article key={fill.tradeId} className="portfolio-exposure-item">
                  <div>
                    <strong>{fill.marketLabel}</strong>
                    <span>
                      {fill.direction} {fill.side} · {fill.shares} shares
                    </span>
                  </div>
                  <div className="portfolio-order-item__amount">
                    <strong>Ksh {fill.notionalKes}</strong>
                    <span>
                      Ksh {fill.priceKes} · {formatDateLabel(fill.executedAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portfolio-state">
              Your matched fills will appear here once the engine starts writing durable trades.
            </div>
          )}
        </section>

        <section className="portfolio-card">
          <div className="portfolio-card__head">
            <span className="market-chip">Recent prints</span>
            <strong data-testid="portfolio-recent-prints-count">
              {recentPrints.length} updates
            </strong>
          </div>

          {recentPrints.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-recent-prints">
              {recentPrints.map((printItem, index) => (
                <article
                  key={`${printItem.marketId}-${printItem.timeLabel}-${index}`}
                  className="portfolio-exposure-item"
                >
                  <div>
                    <strong>{printItem.marketLabel}</strong>
                    <span>
                      {printItem.side} print · {printItem.shares} shares
                    </span>
                  </div>
                  <div className="portfolio-order-item__amount">
                    <strong>Ksh {printItem.priceKes}</strong>
                    <span>{printItem.timeLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portfolio-state">
              Recent public prints from your active markets will appear here once the board has live
              activity to follow.
            </div>
          )}
        </section>

        <section className="portfolio-card">
          <div className="portfolio-card__head">
            <span className="market-chip">Discovery signals</span>
            <strong data-testid="portfolio-discovery-signal-count">
              {topFeedSignals.length} markets
            </strong>
          </div>

          {topFeedSignals.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-discovery-signals">
              {topFeedSignals.map((item) => (
                <article key={item.marketSlug} className="portfolio-signal-item">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div className="portfolio-order-item__amount">
                    <strong>{item.statusLabel}</strong>
                    <span>{item.summary}</span>
                    {item.lastInteractedAt ? (
                      <span>Last active {formatDateLabel(item.lastInteractedAt)}</span>
                    ) : null}
                  </div>
                  <div className="portfolio-signal-item__actions">
                    <Link href={item.actionHref} className="primary-button">
                      {item.actionLabel}
                    </Link>
                    <Link href={item.secondaryHref} className="ghost-button">
                      {item.secondaryLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="portfolio-state">
              Markets you linger on in the feed will start surfacing here once you browse a little
              more.
            </div>
          )}
        </section>
      </div>

      <section className="portfolio-card">
        <div className="portfolio-card__head">
          <span className="market-chip">Recent activity</span>
          <strong>{latestActivity.length} entries</strong>
        </div>

        {error ? (
          <div className="portfolio-inline-note portfolio-inline-note--danger" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="portfolio-state">Loading recent wallet activity...</div>
        ) : latestActivity.length ? (
          <div className="portfolio-activity-list" data-testid="portfolio-activity">
            {latestActivity.map((item) => (
              <article key={item.id} className="portfolio-activity-item">
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.subtitle} · {formatDateLabel(item.createdAt)}
                  </span>
                </div>
                <div className="portfolio-activity-item__amount">
                  <strong>Ksh {item.amountKes}</strong>
                  <span className={`portfolio-activity-item__status portfolio-activity-item__status--${item.status}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="portfolio-state">No wallet activity yet. Your first deposit or verification credit will appear here.</div>
        )}
      </section>
    </section>
  );
}
