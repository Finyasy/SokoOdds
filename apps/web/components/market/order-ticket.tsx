"use client";

import { useState } from "react";
import type { Market } from "@/lib/mock-data";
import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { ProbabilityPill } from "./probability-pill";
import { MarketIdentity } from "./market-identity";

type OrderTicketProps = {
  market: Market;
};

export function OrderTicket({ market }: OrderTicketProps) {
  const {
    state,
    isSyncingAccount,
    openAccountSheet,
    openVerificationSheet,
    requestWalletTopUp,
    submitOrder
  } = useOnboarding();
  const [orderState, setOrderState] = useState<"idle" | "submitting" | "submitted">("idle");
  const [walletState, setWalletState] = useState<"idle" | "funding" | "funded">("idle");
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
        : !canTrade
          ? walletState === "funding"
            ? "Sending M-Pesa prompt..."
            : walletState === "funded"
              ? "Wallet topped up"
              : "Add KES 500 via M-Pesa"
        : orderState === "submitted"
          ? "First trade submitted"
        : orderState === "submitting"
          ? "Submitting order..."
          : `Buy ${quantity} YES shares`;

  const helperCopy = isSyncingAccount
    ? "We are loading the latest wallet state before the first trade action appears."
    : !state.isSignedIn
      ? "Sign in first so your alerts, wallet state, and market activity can stay tied to one account."
      : !state.mpesaVerified
        ? "First-time users verify one M-Pesa number with a KES 5 prompt. That amount is added back to the wallet."
        : !canTrade
          ? "Your verified wallet can trigger a small M-Pesa top-up here instead of stopping the trade flow."
        : orderState === "submitted"
          ? "Funds moved from available balance into reserved balance. The execution event will fan out as the engine comes online."
          : "Your wallet is ready. This first order goes through the live API so you can review the real reserve-funds behavior.";

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
      setWalletState("funding");

      try {
        await requestWalletTopUp(500);
        setWalletState("funded");
      } catch {
        setWalletState("idle");
      }
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
      setWalletState("idle");
    } catch (error) {
      setOrderState("idle");
      setOrderError(error instanceof Error ? error.message : "Could not submit this order.");
    }
  }

  return (
    <aside className="panel order-ticket">
      <div className="order-ticket__market-head">
        <MarketIdentity market={market} size="sm" />
        <div className="order-ticket__market-copy">
          <span className="market-chip">Order ticket</span>
          <strong>{market.shortLabel}</strong>
        </div>
      </div>

      <div className="order-ticket__mode-row">
        <button type="button" className="order-ticket__mode order-ticket__mode--active">
          Buy
        </button>
        <button type="button" className="order-ticket__mode">
          Sell
        </button>
        <span className="order-ticket__mode-label">Market</span>
      </div>

      <div className="order-ticket__choice">
        <ProbabilityPill label="YES" value={market.yesPrice} />
        <ProbabilityPill label="NO" value={market.noPrice} tone="no" />
      </div>

      <div className="order-ticket__amount-stage" aria-label="Order amount snapshot">
        <span className="order-ticket__amount-label">Amount</span>
        <strong>{formatKes(estimatedStake)}</strong>
      </div>

      <div className="ticket-balance-strip">
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

      <div className="order-ticket__quick-amounts" aria-label="Quick funding amounts">
        <button type="button" className="order-ticket__quick-chip">
          +{formatKes(100)}
        </button>
        <button type="button" className="order-ticket__quick-chip">
          +{formatKes(250)}
        </button>
        <button type="button" className="order-ticket__quick-chip">
          +{formatKes(500)}
        </button>
        <button type="button" className="order-ticket__quick-chip">
          Max
        </button>
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

      {walletState === "funded" ? (
        <div className="wallet-callout wallet-callout--success" data-testid="order-ticket-topup-success">
          <span className="wallet-callout__status wallet-callout__status--ready">Wallet topped up</span>
          <p>We initiated a KES 500 M-Pesa top-up so you can continue trading without leaving this market.</p>
        </div>
      ) : null}

      <div className="ticket-summary-grid">
        <div>
          <span>Cost</span>
          <strong>{formatKes(estimatedStake)}</strong>
        </div>
        <div>
          <span>Estimated payout</span>
          <strong>{formatKes(quantity)}</strong>
        </div>
      </div>

      <p className="panel-note order-ticket__note">
        Submitting an order moves funds into reserved balance first. Fills can be partial during
        active trading.
      </p>

      <button
        type="button"
        className="primary-button primary-button--block"
        onClick={() => void handlePrimaryAction()}
        disabled={
          isSyncingAccount ||
          orderState === "submitting" ||
          orderState === "submitted" ||
          walletState === "funding"
        }
      >
        {actionLabel}
      </button>
    </aside>
  );
}
