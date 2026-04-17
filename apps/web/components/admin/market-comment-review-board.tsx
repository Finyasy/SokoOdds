"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import {
  fetchAdminMarketComments,
  type AdminMarketCommentItem,
} from "@/lib/account-client";

type CommentStatusFilter = "all" | "visible" | "hidden";

const STATUS_FILTERS: CommentStatusFilter[] = ["visible", "hidden", "all"];

function formatQueueDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatusLabel(value: CommentStatusFilter | string) {
  return value.replace(/_/g, " ");
}

export function MarketCommentReviewBoard() {
  const { state, openAccountSheet, isSyncingAccount } = useOnboarding();
  const [statusFilter, setStatusFilter] = useState<CommentStatusFilter>("visible");
  const [items, setItems] = useState<AdminMarketCommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModeratingId, setIsModeratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const latestLoadIdRef = useRef(0);
  const statusFilterRef = useRef<CommentStatusFilter>(statusFilter);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  const boardSummary = useMemo(() => {
    if (statusFilter === "visible") {
      return "Recent market comments that are still live and can be hidden quickly when they need intervention.";
    }
    if (statusFilter === "hidden") {
      return "A compact audit trail of comments already removed from the public market discussion.";
    }
    return "A full review queue for market conversation, spanning both live and hidden comments.";
  }, [statusFilter]);

  useEffect(() => {
    if (!state.isSignedIn || !state.isAdmin) {
      setItems([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadQueue() {
      const requestId = latestLoadIdRef.current + 1;
      latestLoadIdRef.current = requestId;
      setIsLoading(true);
      setError(null);
      setItems([]);

      try {
        const payload = await fetchAdminMarketComments({
          status: statusFilter,
          limit: 30,
        });
        if (!cancelled && latestLoadIdRef.current === requestId) {
          setItems(payload.items);
        }
      } catch (loadError) {
        if (!cancelled && latestLoadIdRef.current === requestId) {
          setItems([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the market moderation queue.",
          );
        }
      } finally {
        if (!cancelled && latestLoadIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [refreshNonce, state.isAdmin, state.isSignedIn, state.phone, statusFilter]);

  async function handleHideComment(item: AdminMarketCommentItem) {
    if (item.status === "hidden") {
      return;
    }

    setIsModeratingId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/markets/${item.marketSlug}/comments/${item.id}/hide`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not hide the comment.");
      }

      const nextFilter = statusFilterRef.current;
      setItems((currentItems) => {
        const nextItem: AdminMarketCommentItem = {
          ...item,
          status: "hidden",
          hiddenAt: new Date().toISOString(),
          hiddenByName: state.name,
        };

        if (nextFilter === "visible") {
          return currentItems.filter((queueItem) => queueItem.id !== item.id);
        }
        if (nextFilter === "hidden") {
          return [nextItem, ...currentItems.filter((queueItem) => queueItem.id !== item.id)];
        }
        return currentItems.map((queueItem) =>
          queueItem.id === item.id ? nextItem : queueItem,
        );
      });
      setRefreshNonce((value) => value + 1);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not hide the comment.",
      );
    } finally {
      setIsModeratingId(null);
    }
  }

  async function handleRestoreComment(item: AdminMarketCommentItem) {
    if (item.status === "visible") {
      return;
    }

    setIsModeratingId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/markets/${item.marketSlug}/comments/${item.id}/restore`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not restore the comment.");
      }

      const nextFilter = statusFilterRef.current;
      setItems((currentItems) => {
        const nextItem: AdminMarketCommentItem = {
          ...item,
          status: "visible",
          hiddenAt: null,
          hiddenByName: null,
        };

        if (nextFilter === "hidden") {
          return currentItems.filter((queueItem) => queueItem.id !== item.id);
        }
        if (nextFilter === "visible") {
          return [nextItem, ...currentItems.filter((queueItem) => queueItem.id !== item.id)];
        }
        return currentItems.map((queueItem) =>
          queueItem.id === item.id ? nextItem : queueItem,
        );
      });
      setRefreshNonce((value) => value + 1);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not restore the comment.",
      );
    } finally {
      setIsModeratingId(null);
    }
  }

  if (isSyncingAccount) {
    return (
      <section className="admin-panel" data-testid="admin-market-comments-board">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin market comments</p>
            <h1>Checking admin session</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!state.isSignedIn) {
    return (
      <section className="admin-panel" data-testid="admin-market-comments-signin-required">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin market comments</p>
            <h1>Sign in to moderate market discussion</h1>
            <p className="admin-panel__summary">
              Use an allowlisted admin number to open the market comment queue and hide comments without leaving the product UI.
            </p>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={openAccountSheet}>
          Sign in as admin
        </button>
      </section>
    );
  }

  if (!state.isAdmin) {
    return (
      <section className="admin-panel" data-testid="admin-market-comments-admin-required">
        <div className="admin-panel__header">
          <div>
            <p className="admin-panel__eyebrow">Admin market comments</p>
            <h1>Admin access is required</h1>
            <p className="admin-panel__summary">
              This queue is reserved for allowlisted moderation accounts because hiding comments changes the public market surface.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel" data-testid="admin-market-comments-board">
      <div className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">Admin market comments</p>
          <h1>Review market discussion</h1>
          <p className="admin-panel__summary">{boardSummary}</p>
        </div>
        <div className="admin-panel__meta">
          <span className="admin-panel__signed-in">Signed in as {state.phone}</span>
          <strong>{items.length} in view</strong>
        </div>
      </div>

      <div className="admin-filter-row" aria-label="Market comment queue status filters">
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
        <div className="admin-state admin-state--error" role="alert" data-testid="admin-market-comments-error">
          <strong>{error}</strong>
          <p>
            {error.toLowerCase().includes("admin")
              ? "Keep this page open and switch to an allowlisted admin session."
              : "Retry the action or refresh this queue once the API is reachable again."}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-state" data-testid="admin-market-comments-loading">
          Loading market comment queue...
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <div className="admin-state" data-testid="admin-market-comments-empty">
          No {formatStatusLabel(statusFilter)} market comments right now.
        </div>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className="admin-queue" data-testid="admin-market-comments-queue">
          {items.map((item) => (
            <article key={item.id} className="admin-queue__item" data-testid="admin-market-comments-item">
              <div className="admin-queue__head">
                <div>
                  <h2>{item.author}</h2>
                  <p>
                    <Link href={`/markets/${item.marketSlug}`} className="admin-queue__market-link">
                      {item.marketQuestion}
                    </Link>
                  </p>
                </div>
                <span className={`admin-queue__status admin-queue__status--${item.status}`}>
                  {formatStatusLabel(item.status)}
                </span>
              </div>

              <div className="admin-queue__reason admin-queue__reason--neutral">
                <strong>Comment</strong>
                <p>{item.body}</p>
              </div>

              <dl className="admin-queue__details">
                <div>
                  <dt>Posted</dt>
                  <dd>{formatQueueDate(item.createdAt)}</dd>
                </div>
                <div>
                  <dt>Likes</dt>
                  <dd>{item.likes}</dd>
                </div>
                <div>
                  <dt>Market</dt>
                  <dd>{item.marketSlug}</dd>
                </div>
              </dl>

              {item.hiddenAt ? (
                <div className="admin-queue__audit">
                  <strong>Hidden audit</strong>
                  <p>
                    Hidden {formatQueueDate(item.hiddenAt)}
                    {item.hiddenByName ? ` by ${item.hiddenByName}` : ""}.
                  </p>
                </div>
              ) : null}

              <div className="admin-queue__actions">
                <Link href={`/markets/${item.marketSlug}`} className="secondary-button">
                  Open market
                </Link>
                {item.status === "visible" ? (
                  <button
                    type="button"
                    className="secondary-button secondary-button--danger"
                    disabled={isModeratingId === item.id}
                    onClick={() => {
                      void handleHideComment(item);
                    }}
                  >
                    {isModeratingId === item.id ? "Hiding..." : "Hide comment"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-button secondary-button--success"
                    disabled={isModeratingId === item.id}
                    onClick={() => {
                      void handleRestoreComment(item);
                    }}
                  >
                    {isModeratingId === item.id ? "Restoring..." : "Restore comment"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
