"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchMyKycProfile,
  fetchWalletTransactions,
  type KycSubmissionResponse,
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

type CashSnapshot = {
  items: WalletTransactionItem[];
  kyc: KycSubmissionResponse | null;
};

export function CashExperience() {
  const {
    state,
    isHydrated,
    isSyncingAccount,
    openAccountSheet,
    openVerificationSheet,
  } = useOnboarding();
  const [snapshot, setSnapshot] = useState<CashSnapshot>({
    items: [],
    kyc: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isSignedIn) {
      setSnapshot({ items: [], kyc: null });
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadCashSnapshot() {
      setIsLoading(true);
      setError(null);

      try {
        const [transactions, kyc] = await Promise.all([
          fetchWalletTransactions(),
          fetchMyKycProfile(),
        ]);

        if (cancelled) {
          return;
        }

        setSnapshot({
          items: transactions.items,
          kyc,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Could not load wallet activity.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCashSnapshot();

    return () => {
      cancelled = true;
    };
  }, [state.isSignedIn, state.phone]);

  const activitySummary = useMemo(() => {
    return snapshot.items.reduce(
      (summary, item) => {
        if (item.kind === "deposit") {
          summary.deposits += 1;
        }
        if (item.kind === "withdrawal") {
          summary.withdrawals += 1;
        }
        if (item.kind === "verification") {
          summary.verifications += 1;
        }
        if (item.status === "completed") {
          summary.completed += 1;
        }
        if (item.status === "pending" || item.status === "review_required") {
          summary.inFlight += 1;
        }
        return summary;
      },
      {
        deposits: 0,
        withdrawals: 0,
        verifications: 0,
        completed: 0,
        inFlight: 0,
      },
    );
  }, [snapshot.items]);

  if (!isHydrated || isSyncingAccount) {
    return (
      <section className="portfolio-shell cash-shell">
        <div className="portfolio-hero cash-hero">
          <div>
            <span className="section-kicker">Cash</span>
            <h1>Loading wallet balances and recent funding activity</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isSignedIn) {
    return (
      <section
        className="portfolio-shell cash-shell cash-shell--signin"
        data-testid="cash-signin-required"
      >
        <div className="cash-signin-card">
          <div>
            <span className="section-kicker">Cash</span>
            <h1>Sign in to review deposits, withdrawals, and wallet readiness.</h1>
            <p>
              Keep M-Pesa setup, recent money movement, and payout status in one account-aware
              surface instead of a static help page.
            </p>
            <div className="cash-signin-card__proof" aria-label="Cash readiness highlights">
              <div>
                <strong>M-Pesa first</strong>
                <span>Deposit prompts, payout status, and wallet checks in one place.</span>
              </div>
              <div>
                <strong>KES-native ledger</strong>
                <span>Recent deposits, withdrawals, and verification events stay visible.</span>
              </div>
            </div>
          </div>
          <div className="cash-signin-card__actions">
            <button type="button" className="primary-button" onClick={openAccountSheet}>
              Sign in to continue
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="portfolio-shell cash-shell" data-testid="cash-overview">
      <div className="portfolio-hero cash-hero">
        <div>
          <span className="section-kicker">Cash</span>
          <h1>{state.name ? `${state.name}'s funding and payout view` : "Funding and payout view"}</h1>
          <p>
            Review available cash, reserved funds, M-Pesa readiness, and recent ledger activity in
            one place before trading or withdrawing.
          </p>
        </div>
        <div className="portfolio-actions">
          <button type="button" className="ghost-button" onClick={openVerificationSheet}>
            Manage wallet setup
          </button>
          <Link href="/portfolio" className="primary-button">
            Open portfolio
          </Link>
        </div>
      </div>

      <section className="cash-metric-grid">
        <article className="cash-metric cash-metric--primary" data-testid="cash-available-balance">
          <span>Available cash</span>
          <strong>{formatKes(state.walletBalanceKes)}</strong>
          <small>Ready for new orders right now.</small>
        </article>
        <article className="cash-metric" data-testid="cash-reserved-balance">
          <span>Reserved funds</span>
          <strong>{formatKes(state.reservedBalanceKes)}</strong>
          <small>Held behind open or partially matched orders.</small>
        </article>
        <article className="cash-metric" data-testid="cash-wallet-readiness">
          <span>M-Pesa and KYC</span>
          <strong>
            {state.mpesaVerified ? "Wallet ready" : "Needs M-Pesa setup"} ·{" "}
            {state.kycStatus.replace(/_/g, " ")}
          </strong>
          <small>Withdrawals and order controls follow your current verification state.</small>
        </article>
      </section>

      <div className="cash-route-grid cash-route-grid--top">
        <section className="cash-route-card cash-route-card--primary cash-route-card--spotlight">
          <div className="portfolio-card__head">
            <span className="market-chip">Funding route</span>
            <strong>M-Pesa first</strong>
          </div>
          <div className="cash-step-list">
            <article className="cash-step">
              <strong>1. Verify the payout number once</strong>
              <span>Use the same number for deposits, withdrawals, and settlement receipts.</span>
            </article>
            <article className="cash-step">
              <strong>2. Approve the STK push</strong>
              <span>Wallet cash updates after the deposit callback confirms the top-up.</span>
            </article>
            <article className="cash-step">
              <strong>3. Track movement here</strong>
              <span>Completed, pending, and review-required money movement all stay visible.</span>
            </article>
          </div>
          <div className="portfolio-actions">
            <button type="button" className="primary-button" onClick={openVerificationSheet}>
              Deposit or withdraw
            </button>
            <Link href="/help" className="ghost-button">
              Funding help
            </Link>
          </div>
        </section>

        <section className="portfolio-card cash-route-card--summary">
          <div className="portfolio-card__head">
            <span className="market-chip">Wallet readiness</span>
            <strong>{snapshot.items.length} recent entries</strong>
          </div>
          <div className="portfolio-stats">
            <div>
              <span>Completed</span>
              <strong>{activitySummary.completed}</strong>
            </div>
            <div>
              <span>In flight</span>
              <strong>{activitySummary.inFlight}</strong>
            </div>
            <div>
              <span>Deposits</span>
              <strong>{activitySummary.deposits}</strong>
            </div>
            <div>
              <span>Withdrawals</span>
              <strong>{activitySummary.withdrawals}</strong>
            </div>
          </div>
          <p className="portfolio-inline-note">
            Verification credits: {activitySummary.verifications}. Recent wallet activity is pulled
            from the same backend-backed account ledger used by the onboarding sheet.
          </p>
        </section>
      </div>

      <div className="portfolio-grid">
        <section className="portfolio-card cash-card--compliance">
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

        <section className="portfolio-card cash-card--mobile-empty">
          <div className="portfolio-card__head">
            <span className="market-chip">Cash states</span>
            <strong>How to read your wallet</strong>
          </div>
          <div className="cash-step-list">
            <article className="cash-step">
              <strong>Available balance</strong>
              <span>Cash that can fund a new order immediately.</span>
            </article>
            <article className="cash-step">
              <strong>Reserved funds</strong>
              <span>Cash parked behind open or partially filled orders until they clear.</span>
            </article>
            <article className="cash-step">
              <strong>Withdrawals</strong>
              <span>Small payouts can complete directly, while larger ones may pause for review.</span>
            </article>
          </div>
        </section>
      </div>

      <section className="portfolio-card">
        <div className="portfolio-card__head">
          <span className="market-chip">Recent activity</span>
          <strong>{snapshot.items.length} entries</strong>
        </div>

        {error ? (
          <div className="portfolio-inline-note portfolio-inline-note--danger" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="portfolio-state">Loading recent wallet activity...</div>
        ) : snapshot.items.length ? (
          <div className="portfolio-activity-list" data-testid="cash-activity">
            {snapshot.items.map((item) => (
              <article key={item.id} className="portfolio-activity-item">
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.subtitle} · {formatDateLabel(item.createdAt)}
                  </span>
                </div>
                <div className="portfolio-activity-item__amount">
                  <strong>Ksh {item.amountKes}</strong>
                  <span
                    className={`portfolio-activity-item__status portfolio-activity-item__status--${item.status}`}
                  >
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="portfolio-state">
            No wallet activity yet. Your first verification credit, deposit, or withdrawal will
            appear here.
          </div>
        )}
      </section>
    </section>
  );
}
