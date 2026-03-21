"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchAdminWalletSupport,
  type AdminWalletSupportItem
} from "@/lib/account-client";

type SupportKindFilter = "all" | "deposit" | "withdrawal";
type SupportStatusFilter = "all" | "pending" | "review_required" | "failed" | "completed";

const KIND_FILTERS: SupportKindFilter[] = ["all", "deposit", "withdrawal"];
const STATUS_FILTERS: SupportStatusFilter[] = [
  "all",
  "pending",
  "review_required",
  "failed",
  "completed"
];

function formatQueueDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function WalletSupportBoard() {
  const { state, openAccountSheet, isSyncingAccount } = useOnboarding();
  const [kindFilter, setKindFilter] = useState<SupportKindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<SupportStatusFilter>("all");
  const [items, setItems] = useState<AdminWalletSupportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boardSummary = useMemo(() => {
    if (statusFilter === "review_required") {
      return "Withdrawals currently holding funds in reserve while they wait for manual support review.";
    }
    if (statusFilter === "failed") {
      return "Recent payment attempts that need support follow-up or callback inspection.";
    }
    if (kindFilter === "deposit") {
      return "Recent M-Pesa top-ups across pending, failed, and completed states.";
    }
    if (kindFilter === "withdrawal") {
      return "Recent M-Pesa payouts across pending, review, failed, and completed states.";
    }
    return "A compact ops queue for recent deposits and withdrawals without leaving the product UI.";
  }, [kindFilter, statusFilter]);

  useEffect(() => {
    if (!state.isSignedIn) {
      setItems([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadQueue() {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchAdminWalletSupport({
          kind: kindFilter,
          status: statusFilter,
          limit: 20
        });
        if (!cancelled) {
          setItems(payload.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setItems([]);
          setError(
            loadError instanceof Error ? loadError.message : "Could not load money support activity."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [kindFilter, state.isSignedIn, state.phone, statusFilter]);

  if (isSyncingAccount) {
    return (
      <section className="admin-panel" data-testid="admin-support-board">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin support</p>
            <h1>Checking admin session</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isSignedIn) {
    return (
      <section className="admin-panel" data-testid="admin-support-signin-required">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin support</p>
            <h1>Sign in to inspect money movement</h1>
            <p className="admin-panel__summary">
              Use an allowlisted admin number to inspect recent deposits and withdrawals from the same account session used across the product.
            </p>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={openAccountSheet}>
          Sign in as admin
        </button>
      </section>
    );
  }

  return (
    <section className="admin-panel" data-testid="admin-support-board">
      <div className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">Admin support</p>
          <h1>Inspect deposits and withdrawals</h1>
          <p className="admin-panel__summary">{boardSummary}</p>
        </div>
        <div className="admin-panel__meta">
          <span className="admin-panel__signed-in">Signed in as {state.phone}</span>
          <strong>{items.length} events</strong>
        </div>
      </div>

      <div className="admin-support-filters">
        <div className="admin-filter-row" aria-label="Money support kind filters">
          {KIND_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`admin-filter-chip${kindFilter === filter ? " admin-filter-chip--active" : ""}`}
              aria-pressed={kindFilter === filter}
              onClick={() => setKindFilter(filter)}
            >
              {formatLabel(filter)}
            </button>
          ))}
        </div>
        <div className="admin-filter-row" aria-label="Money support status filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`admin-filter-chip${statusFilter === filter ? " admin-filter-chip--active" : ""}`}
              aria-pressed={statusFilter === filter}
              onClick={() => setStatusFilter(filter)}
            >
              {formatLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="admin-state admin-state--error" role="alert" data-testid="admin-support-error">
          <strong>{error}</strong>
          <p>
            {error.toLowerCase().includes("admin")
              ? "Keep the same page, but sign in with an allowlisted admin phone number."
              : "Retry the filter or refresh this page once the API is reachable again."}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-state" data-testid="admin-support-loading">
          Loading money support activity...
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="admin-state" data-testid="admin-support-empty">
          No {formatLabel(statusFilter)} {formatLabel(kindFilter)} activity right now.
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="admin-queue" data-testid="admin-support-queue">
          {items.map((item) => (
            <article className="admin-queue__item" key={item.id} data-testid="admin-support-item">
              <div className="admin-queue__head">
                <div>
                  <h2>{item.title}</h2>
                  <p>
                    {item.firstName} · {item.phone}
                  </p>
                </div>
                <span className={`admin-queue__status admin-queue__status--${item.status}`}>
                  {formatLabel(item.status)}
                </span>
              </div>

              <dl className="admin-queue__details">
                <div>
                  <dt>Kind</dt>
                  <dd>{formatLabel(item.kind)}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>Ksh {item.amountKes}</dd>
                </div>
                <div>
                  <dt>Started</dt>
                  <dd>{formatQueueDate(item.createdAt)}</dd>
                </div>
              </dl>

              <div className="admin-queue__reason">
                <strong>Support note</strong>
                <p>{item.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
