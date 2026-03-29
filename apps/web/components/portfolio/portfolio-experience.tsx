"use client";

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
import { formatKes } from "@/lib/mock-data";

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

type PortfolioSnapshot = {
  items: WalletTransactionItem[];
  kyc: KycSubmissionResponse | null;
  orders: PortfolioOrdersResponse | null;
};

export function PortfolioExperience() {
  const {
    state,
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
      <section className="portfolio-shell" data-testid="portfolio-signin-required">
        <div className="portfolio-hero portfolio-hero--compact">
          <div>
            <span className="section-kicker">Portfolio</span>
            <h1>Sign in to see your wallet, KYC, and payout history.</h1>
            <p>
              Keep deposits, withdrawals, and market-ready balance in one calm support surface.
            </p>
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

      <div className="portfolio-grid">
        <section className="portfolio-card portfolio-card--summary">
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

        <section className="portfolio-card">
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

      <section className="portfolio-card">
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
              {snapshot.orders?.items[0]?.status.replace(/_/g, " ") ?? "No orders yet"}
            </strong>
          </div>
        </div>

        {snapshot.orders?.items.length ? (
          <div className="portfolio-order-list" data-testid="portfolio-orders">
            {snapshot.orders.items.slice(0, 6).map((item) => (
              <article key={item.id} className="portfolio-order-item">
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

      <div className="portfolio-grid">
        <section className="portfolio-card">
          <div className="portfolio-card__head">
            <span className="market-chip">Positions</span>
            <strong data-testid="portfolio-position-count">
              {snapshot.orders?.positions.length ?? 0} markets
            </strong>
          </div>

          {snapshot.orders?.positions.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-positions">
              {snapshot.orders.positions.map((position) => (
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
              {snapshot.orders?.markets.length ?? 0} markets
            </strong>
          </div>

          {snapshot.orders?.markets.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-market-exposure">
              {snapshot.orders.markets.map((market) => (
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
              {snapshot.orders?.fills.length ?? 0} fills
            </strong>
          </div>

          {snapshot.orders?.fills.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-fills">
              {snapshot.orders.fills.map((fill) => (
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
              {snapshot.orders?.recentPrints.length ?? 0} updates
            </strong>
          </div>

          {snapshot.orders?.recentPrints.length ? (
            <div className="portfolio-exposure-list" data-testid="portfolio-recent-prints">
              {snapshot.orders.recentPrints.map((printItem, index) => (
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
