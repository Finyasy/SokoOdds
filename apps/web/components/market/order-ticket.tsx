"use client";

import { useState } from "react";
import type { Market } from "@/lib/mock-data";
import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { ProbabilityPill } from "./probability-pill";

type OrderTicketProps = {
  market: Market;
};

export function OrderTicket({ market }: OrderTicketProps) {
  const {
    state,
    isSyncingAccount,
    openAccountSheet,
    openVerificationSheet,
    submitOrder
  } = useOnboarding();
  const [orderState, setOrderState] = useState<"idle" | "submitting" | "submitted">("idle");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const quantity = 8;
  const estimatedStake = quantity * market.yesPrice;
  const canTrade = state.isSignedIn && state.mpesaVerified && state.walletBalanceKes >= estimatedStake;

  const actionLabel = isSyncingAccount
    ? "Checking wallet"
    : !state.isSignedIn
      ? "Create account to trade"
      : !state.mpesaVerified
        ? "Verify M-Pesa with KES 5"
        : orderState === "submitted"
          ? "First trade submitted"
        : orderState === "submitting"
          ? "Submitting order..."
          : canTrade
            ? `Buy ${quantity} YES shares`
            : "Top up wallet to trade";

  const helperCopy = isSyncingAccount
    ? "We are loading the latest wallet state before the first trade action appears."
    : !state.isSignedIn
      ? "Sign in first so your alerts, wallet state, and market activity can stay tied to one account."
      : !state.mpesaVerified
        ? "First-time users verify one M-Pesa number with a KES 5 prompt. That amount is added back to the wallet."
        : orderState === "submitted"
          ? "Funds moved from available balance into reserved balance. The execution event will fan out as the engine comes online."
          : canTrade
            ? "Your wallet is ready. This first order goes through the live API so you can review the real reserve-funds behavior."
            : "Your first verification credit is live. After one small trade you will need a real top-up flow to keep trading.";

  async function handlePrimaryAction() {
    if (isSyncingAccount) {
      return;
    }

    if (!state.isSignedIn) {
      openAccountSheet();
      return;
    }

    if (!state.mpesaVerified) {
      openVerificationSheet();
      return;
    }

    if (!canTrade) {
      openVerificationSheet();
      return;
    }

    setOrderError(null);
    setOrderState("submitting");

    try {
      const result = await submitOrder({
        market_id: market.id,
        side: "YES",
        direction: "BUY",
        price: market.yesPrice.toFixed(2),
        quantity: String(quantity)
      });

      setLastOrderId(result.orderId);
      setOrderState("submitted");
    } catch (error) {
      setOrderState("idle");
      setOrderError(error instanceof Error ? error.message : "Could not submit this order.");
    }
  }

  return (
    <aside className="panel order-ticket">
      <div className="panel__header">
        <span className="market-chip">Order ticket</span>
        <strong>Buy YES</strong>
      </div>

      <div className="order-ticket__choice">
        <ProbabilityPill label="YES" value={market.yesPrice} />
        <ProbabilityPill label="NO" value={market.noPrice} tone="no" />
      </div>

      <div className="order-ticket__form">
        <label>
          Price per share
          <div className="input-shell">{Math.round(market.yesPrice * 100)} KES</div>
        </label>
        <label>
          Shares
          <div className="input-shell">{quantity}</div>
        </label>
      </div>

      <div className="wallet-callout">
        <span className={`wallet-callout__status${state.mpesaVerified ? " wallet-callout__status--ready" : ""}`}>
          {actionLabel}
        </span>
        <p>{helperCopy}</p>
      </div>

      {orderError ? (
        <div className="wallet-callout wallet-callout--danger" role="alert">
          <span className="wallet-callout__status wallet-callout__status--danger">Order needs attention</span>
          <p>{orderError}</p>
        </div>
      ) : null}

      {lastOrderId ? (
        <div className="wallet-callout wallet-callout--success" data-testid="order-ticket-success">
          <span className="wallet-callout__status wallet-callout__status--ready">Order submitted</span>
          <p>
            Order <strong>{lastOrderId}</strong> is now holding {formatKes(estimatedStake)} in
            reserved funds for this market.
          </p>
        </div>
      ) : null}

      <div className="stat-list">
        <div>
          <span>Estimated stake</span>
          <strong>{formatKes(estimatedStake)}</strong>
        </div>
        <div>
          <span>Payout if correct</span>
          <strong>{formatKes(quantity)}</strong>
        </div>
        <div>
          <span>Available balance</span>
          <strong data-testid="order-ticket-available-balance">
            {formatKes(state.walletBalanceKes)}
          </strong>
        </div>
        <div>
          <span>Reserved funds</span>
          <strong data-testid="order-ticket-reserved-balance">
            {formatKes(state.reservedBalanceKes)}
          </strong>
        </div>
      </div>

      <p className="panel-note">
        Submitting an order moves funds into reserved balance first. Fills can be partial during
        active trading.
      </p>

      <button
        type="button"
        className="primary-button primary-button--block"
        onClick={() => void handlePrimaryAction()}
        disabled={isSyncingAccount || orderState === "submitting" || orderState === "submitted"}
      >
        {actionLabel}
      </button>
    </aside>
  );
}
