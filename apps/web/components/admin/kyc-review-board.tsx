"use client";

import { useEffect, useMemo, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchAdminKycQueue,
  reviewAdminKycProfile,
  type AdminKycQueueItem
} from "@/lib/account-client";

type QueueStatusFilter = "pending" | "approved" | "rejected";

const STATUS_FILTERS: QueueStatusFilter[] = ["pending", "approved", "rejected"];

function formatQueueDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function KycReviewBoard() {
  const { state, openAccountSheet, isSyncingAccount } = useOnboarding();
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>("pending");
  const [items, setItems] = useState<AdminKycQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const boardSummary = useMemo(() => {
    if (statusFilter === "pending") {
      return "Profiles waiting for approval before tighter deposit, withdrawal, and trading gates are turned on.";
    }
    if (statusFilter === "approved") {
      return "Recently approved profiles that are cleared for stricter money-flow and trading controls.";
    }
    return "Rejected profiles that still need a visible audit trail and a clear reason for support follow-up.";
  }, [statusFilter]);

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
        const payload = await fetchAdminKycQueue(statusFilter);
        if (!cancelled) {
          setItems(payload.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setItems([]);
          setError(loadError instanceof Error ? loadError.message : "Could not load the KYC queue.");
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
  }, [state.isSignedIn, state.phone, statusFilter]);

  async function reviewProfile(userId: string, decision: "approved" | "rejected") {
    setActiveUserId(userId);
    setError(null);

    try {
      await reviewAdminKycProfile({
        userId,
        decision,
        rejectionReason: decision === "rejected" ? rejectionReasons[userId] : undefined
      });
      const payload = await fetchAdminKycQueue(statusFilter);
      setItems(payload.items);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not complete the review.");
    } finally {
      setActiveUserId(null);
    }
  }

  if (isSyncingAccount) {
    return (
      <section className="admin-panel" data-testid="admin-kyc-board">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin KYC</p>
            <h1>Checking admin session</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isSignedIn) {
    return (
      <section className="admin-panel" data-testid="admin-kyc-signin-required">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin KYC</p>
            <h1>Sign in to review pending profiles</h1>
            <p className="admin-panel__summary">
              Use an allowlisted admin number to open the review queue without leaving the same calm account flow.
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
    <section className="admin-panel" data-testid="admin-kyc-board">
      <div className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">Admin KYC</p>
          <h1>Review identity profiles</h1>
          <p className="admin-panel__summary">{boardSummary}</p>
        </div>
        <div className="admin-panel__meta">
          <span className="admin-panel__signed-in">Signed in as {state.phone}</span>
          <strong>{items.length} in view</strong>
        </div>
      </div>

      <div className="admin-filter-row" aria-label="KYC queue status filters">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`admin-filter-chip${statusFilter === filter ? " admin-filter-chip--active" : ""}`}
            aria-pressed={statusFilter === filter}
            onClick={() => setStatusFilter(filter)}
          >
            {formatStatusLabel(filter)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="admin-state admin-state--error" role="alert" data-testid="admin-kyc-error">
          <strong>{error}</strong>
          <p>
            {error.toLowerCase().includes("admin")
              ? "Keep the same page, but sign in with an allowlisted admin phone number."
              : "Retry the review action or refresh this page once the API is reachable again."}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-state" data-testid="admin-kyc-loading">
          Loading KYC queue...
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="admin-state" data-testid="admin-kyc-empty">
          No {formatStatusLabel(statusFilter)} profiles right now.
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="admin-queue" data-testid="admin-kyc-queue">
          {items.map((item) => {
            const rejectionReason = rejectionReasons[item.userId] ?? "";
            const isSubmitting = activeUserId === item.userId;

            return (
              <article className="admin-queue__item" key={item.userId} data-testid="admin-kyc-item">
                <div className="admin-queue__head">
                  <div>
                    <h2>{item.legalName}</h2>
                    <p>{item.phone}</p>
                  </div>
                  <span className={`admin-queue__status admin-queue__status--${item.status}`}>
                    {formatStatusLabel(item.status)}
                  </span>
                </div>

                <dl className="admin-queue__details">
                  <div>
                    <dt>National ID</dt>
                    <dd>{item.nationalIdNumberMasked}</dd>
                  </div>
                  <div>
                    <dt>Document</dt>
                    <dd>{item.documentType}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatQueueDate(item.submittedAt)}</dd>
                  </div>
                </dl>

                {item.rejectionReason ? (
                  <div className="admin-queue__reason">
                    <strong>Last rejection reason</strong>
                    <p>{item.rejectionReason}</p>
                  </div>
                ) : null}

                {statusFilter === "pending" ? (
                  <div className="admin-queue__actions">
                    <button
                      type="button"
                      className="secondary-button secondary-button--success"
                      disabled={isSubmitting}
                      onClick={() => {
                        void reviewProfile(item.userId, "approved");
                      }}
                    >
                      {isSubmitting ? "Processing..." : "Approve"}
                    </button>
                    <label className="admin-queue__reject-field">
                      <span>Reject reason</span>
                      <input
                        type="text"
                        value={rejectionReason}
                        placeholder="Explain what needs fixing"
                        onChange={(event) => {
                          setRejectionReasons((current) => ({
                            ...current,
                            [item.userId]: event.target.value
                          }));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="secondary-button secondary-button--danger"
                      disabled={isSubmitting || rejectionReason.trim().length < 6}
                      onClick={() => {
                        void reviewProfile(item.userId, "rejected");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
