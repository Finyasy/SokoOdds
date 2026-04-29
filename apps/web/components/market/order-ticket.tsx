"use client";

import { useEffect, useMemo, useState } from "react";
import type { Market } from "@/lib/mock-data";
import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { MarketIdentity } from "./market-identity";

type OrderTicketProps = {
  market: Market;
};

const QUICK_QUANTITY_OPTIONS = [4, 8, 12];
const ACTIVE_ORDER_STATUSES = new Set(["submitted", "accepted", "partially_filled"]);

export function OrderTicket({ market }: OrderTicketProps) {
  const {
    state,
    watchlist,
    recentMarketSlugs,
    notificationPreferences,
    feedInteractions,
    portfolioOrders,
    isHydrated,
    isSyncingAccount,
    openAccountSheet,
    openVerificationSheet,
    requestWalletTopUp,
    submitOrder
  } = useOnboarding();
  const [orderState, setOrderState] = useState<"idle" | "submitting" | "submitted">("idle");
  const [walletState, setWalletState] = useState<"idle" | "funding" | "funded">("idle");
  const [orderDirection, setOrderDirection] = useState<"BUY" | "SELL">("BUY");
  const [contractSide, setContractSide] = useState<"YES" | "NO">("YES");
  const [quantity, setQuantity] = useState(8);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const activePortfolioSnapshot = state.isSignedIn ? portfolioOrders : null;
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
            priceMoves: false,
            marketResolutions: true,
            accountAlerts: true
          },
    [isHydrated, notificationPreferences]
  );
  const stableFeedInteractions = useMemo(
    () => (isHydrated ? feedInteractions : {}),
    [feedInteractions, isHydrated]
  );
  const isWatchlisted = stableWatchlist.includes(market.slug);
  const feedSignal = stableFeedInteractions[market.slug];
  const selectedPrice = contractSide === "YES" ? market.yesPrice : market.noPrice;
  const estimatedValue = quantity * selectedPrice;
  const marketExposure = useMemo(
    () => activePortfolioSnapshot?.markets?.find((item) => item.marketId === market.id) ?? null,
    [activePortfolioSnapshot, market.id]
  );
  const selectedSidePosition = useMemo(
    () =>
      activePortfolioSnapshot?.positions?.find(
        (position) => position.marketId === market.id && position.side === contractSide
      ) ?? null,
    [activePortfolioSnapshot, contractSide, market.id]
  );
  const openSellQuantity = useMemo(
    () =>
      (activePortfolioSnapshot?.items ?? [])
        .filter(
          (order) =>
            order.marketId === market.id &&
            order.side === contractSide &&
            order.direction === "SELL" &&
            ACTIVE_ORDER_STATUSES.has(order.status)
        )
        .reduce((sum, order) => sum + Number(order.quantity), 0),
    [activePortfolioSnapshot, contractSide, market.id]
  );
  const availableSellShares = Math.max(
    0,
    Number(selectedSidePosition?.shares ?? "0") - openSellQuantity
  );
  const maxBuyQuantity =
    state.isSignedIn && state.mpesaVerified
      ? Math.floor(state.walletBalanceKes / Math.max(selectedPrice, 0.01))
      : 0;
  const maxSellQuantity = Math.floor(availableSellShares);

  function resetSubmissionFeedback() {
    setOrderState("idle");
    setOrderError(null);
    setLastOrderId(null);
  }

  useEffect(() => {
    if (orderState === "submitted") {
      return;
    }

    if (orderDirection === "SELL" && maxSellQuantity > 0 && quantity > maxSellQuantity) {
      setQuantity(maxSellQuantity);
      return;
    }

    if (
      orderDirection === "BUY" &&
      state.isSignedIn &&
      state.mpesaVerified &&
      maxBuyQuantity > 0 &&
      quantity > maxBuyQuantity
    ) {
      setQuantity(maxBuyQuantity);
    }
  }, [
    maxBuyQuantity,
    maxSellQuantity,
    orderDirection,
    orderState,
    quantity,
    state.isSignedIn,
    state.mpesaVerified
  ]);

  const ticketContext = useMemo(() => {
    const items: string[] = [];

    if (selectedSidePosition) {
      items.push(`Holding ${selectedSidePosition.side} ${selectedSidePosition.shares} shares`);
    }
    if (orderDirection === "SELL" && availableSellShares > 0) {
      items.push(`${availableSellShares.toFixed(2)} ${contractSide} shares free to sell`);
    }
    if (marketExposure) {
      items.push(`${marketExposure.activeOrderCount} live orders here`);
    }
    if (feedSignal?.openedCount) {
      items.push(`Opened ${feedSignal.openedCount}x from feed`);
    }
    if (feedSignal?.pausedCount) {
      items.push(`Paused on ${feedSignal.pausedCount}x`);
    }
    if (isWatchlisted) {
      items.push("Saved to watchlist");
    }
    if (stableRecentMarketSlugs.includes(market.slug)) {
      items.push("Recently viewed");
    }
    if (stableNotificationPreferences.priceMoves) {
      items.push("Price alerts on");
    }

    return items.slice(0, 4);
  }, [
    availableSellShares,
    contractSide,
    feedSignal,
    isWatchlisted,
    market.slug,
    marketExposure,
    orderDirection,
    selectedSidePosition,
    stableNotificationPreferences.priceMoves,
    stableRecentMarketSlugs
  ]);

  const hasSelectedPosition = Boolean(selectedSidePosition && Number(selectedSidePosition.shares) > 0);
  const canBuy =
    state.isSignedIn && state.mpesaVerified && quantity > 0 && state.walletBalanceKes >= estimatedValue;
  const canSell = state.isSignedIn && state.mpesaVerified && quantity > 0 && availableSellShares >= quantity;
  const canSubmit = orderDirection === "BUY" ? canBuy : canSell;

  const ticketIntentLabel =
    orderDirection === "BUY"
      ? hasSelectedPosition
        ? `Add to your ${contractSide} position`
        : marketExposure
          ? `Layer into live ${contractSide} interest`
          : `Start a ${contractSide} position`
      : hasSelectedPosition
        ? `Trim your ${contractSide} position`
        : `Sell held ${contractSide} shares`;

  const summaryLabel =
    orderDirection === "BUY"
      ? hasSelectedPosition
        ? "Position after order"
        : marketExposure
          ? "Reserved after order"
          : "Starting exposure"
      : hasSelectedPosition
        ? "Position after sale"
        : "Position required";

  const summaryValue =
    orderDirection === "BUY"
      ? hasSelectedPosition
        ? `${contractSide} ${(
            Number(selectedSidePosition?.shares ?? "0") + quantity
          ).toFixed(2)} shares`
        : marketExposure
          ? formatKes(Number(marketExposure?.reservedAmountKes ?? "0") + estimatedValue)
          : `${quantity} ${contractSide} shares`
      : hasSelectedPosition
        ? `${contractSide} ${Math.max(
            0,
            Number(selectedSidePosition?.shares ?? "0") - quantity
          ).toFixed(2)} shares`
        : `Need ${quantity} ${contractSide} shares`;

  const costLabel = orderDirection === "BUY" ? "Cost" : "Proceeds at limit";
  const outcomeLabel =
    orderDirection === "BUY"
      ? hasSelectedPosition
        ? "Blended market value"
        : marketExposure
          ? "Reserved after order"
          : "Estimated payout"
      : "Shares to sell";
  const outcomeValue =
    orderDirection === "BUY"
      ? hasSelectedPosition
        ? formatKes(Number(selectedSidePosition?.marketValueKes ?? "0") + estimatedValue)
        : marketExposure
          ? formatKes(Number(marketExposure?.reservedAmountKes ?? "0") + estimatedValue)
          : formatKes(quantity)
      : `${quantity} ${contractSide} shares`;

  const actionLabel = isSyncingAccount
    ? "Checking wallet"
    : !state.isSignedIn
      ? "Create account to trade"
      : !state.mpesaVerified
        ? "Verify M-Pesa with KES 5"
        : orderDirection === "BUY" && !canBuy
          ? walletState === "funding"
            ? "Sending M-Pesa prompt..."
            : walletState === "funded"
              ? "Wallet topped up"
              : "Add KES 500 via M-Pesa"
          : orderDirection === "SELL" && !canSell
            ? hasSelectedPosition
              ? `Sell up to ${maxSellQuantity || 0} ${contractSide}`
              : `No ${contractSide} shares to sell`
            : orderState === "submitted"
              ? orderDirection === "BUY"
                ? "Buy order submitted"
                : "Sell order submitted"
              : orderState === "submitting"
                ? "Submitting order..."
                : orderDirection === "BUY"
                  ? `Buy ${quantity} ${contractSide} shares`
                  : `Sell ${quantity} ${contractSide} shares`;

  const helperCopy = isSyncingAccount
    ? "We are loading the latest wallet state before the first trade action appears."
    : !state.isSignedIn
      ? "Sign in first so your alerts, wallet state, and market activity can stay tied to one account."
      : !state.mpesaVerified
        ? "First-time users verify one M-Pesa number with a KES 5 prompt. That amount is added back to the wallet."
        : orderDirection === "BUY"
          ? !canBuy
            ? "Your verified wallet can trigger a small M-Pesa top-up here instead of stopping the trade flow."
            : orderState === "submitted"
              ? hasSelectedPosition
                ? "Funds moved into this market again, increasing your live position while execution updates continue to settle in."
                : marketExposure
                  ? "This market now has more reserved order exposure. Matching and fill updates will keep rolling into the portfolio state."
                  : "Funds moved from available balance into reserved balance. The execution event will fan out as the engine comes online."
              : hasSelectedPosition
                ? `You already hold ${selectedSidePosition?.side ?? contractSide} here, so this order adds to an existing position.`
                : marketExposure
                  ? `You already have ${marketExposure?.activeOrderCount ?? 0} live orders here, so this order layers into that exposure instead of starting fresh.`
                  : "Your wallet is ready. This first order goes through the live API so you can review the real reserve-funds behavior."
          : !hasSelectedPosition
            ? `You need held ${contractSide} shares before you can place a sell order in this market.`
            : !canSell
              ? `You currently have ${availableSellShares.toFixed(2)} ${contractSide} shares free to sell after accounting for other live sell orders.`
              : orderState === "submitted"
                ? `Your sell order is now live against held ${contractSide} shares. Matching and partial fills will update proceeds and remaining exposure in portfolio state.`
                : `This sell order is backed by your held ${contractSide} shares, so it can route without asking for extra wallet cash first.`;

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

    if (orderDirection === "BUY" && !canBuy) {
      setWalletState("funding");

      try {
        await requestWalletTopUp(500);
        setWalletState("funded");
      } catch {
        setWalletState("idle");
      }
      return;
    }

    if (orderDirection === "SELL" && !canSell) {
      return;
    }

    setOrderError(null);
    setOrderState("submitting");

    try {
      const result = await submitOrder({
        market_id: market.id,
        side: contractSide,
        direction: orderDirection,
        price: selectedPrice.toFixed(2),
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
          <span className="order-ticket__intent">{ticketIntentLabel}</span>
        </div>
      </div>

      <div className="order-ticket__mode-row">
        <button
          type="button"
          className={`order-ticket__mode${orderDirection === "BUY" ? " order-ticket__mode--active" : ""}`}
          aria-pressed={orderDirection === "BUY"}
          onClick={() => {
            resetSubmissionFeedback();
            setOrderDirection("BUY");
          }}
        >
          Buy
        </button>
        <button
          type="button"
          className={`order-ticket__mode${orderDirection === "SELL" ? " order-ticket__mode--active" : ""}`}
          aria-pressed={orderDirection === "SELL"}
          onClick={() => {
            resetSubmissionFeedback();
            setOrderDirection("SELL");
          }}
        >
          Sell
        </button>
        <span className="order-ticket__mode-label">Market</span>
      </div>

      <div className="order-ticket__choice" role="tablist" aria-label="Contract side">
        <button
          type="button"
          className={`order-ticket__choice-card order-ticket__choice-card--yes${
            contractSide === "YES" ? " order-ticket__choice-card--active" : ""
          }`}
          aria-pressed={contractSide === "YES"}
          onClick={() => {
            resetSubmissionFeedback();
            setContractSide("YES");
          }}
        >
          <span>Yes</span>
          <strong>{Math.round(market.yesPrice * 100)}c</strong>
        </button>
        <button
          type="button"
          className={`order-ticket__choice-card order-ticket__choice-card--no${
            contractSide === "NO" ? " order-ticket__choice-card--active" : ""
          }`}
          aria-pressed={contractSide === "NO"}
          onClick={() => {
            resetSubmissionFeedback();
            setContractSide("NO");
          }}
        >
          <span>No</span>
          <strong>{Math.round(market.noPrice * 100)}c</strong>
        </button>
      </div>

      <div className="order-ticket__amount-stage" aria-label="Order amount snapshot">
        <span className="order-ticket__amount-label">
          {orderDirection === "BUY" ? "Amount" : "Order value"}
        </span>
        <strong>{formatKes(estimatedValue)}</strong>
      </div>

      {ticketContext.length ? (
        <div className="order-ticket__context">
          <span className="order-ticket__context-label">Why this still matters</span>
          <div className="order-ticket__context-chips">
            {ticketContext.map((item) => (
              <span key={item} className="order-ticket__context-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="order-ticket__quick-amounts" aria-label="Quick quantity choices">
        {QUICK_QUANTITY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`order-ticket__quick-chip${quantity === option ? " order-ticket__quick-chip--active" : ""}`}
            onClick={() => {
              resetSubmissionFeedback();
              setQuantity(option);
            }}
          >
            {option} sh
          </button>
        ))}
        <button
          type="button"
          className={`order-ticket__quick-chip${
            quantity === (orderDirection === "BUY" ? maxBuyQuantity : maxSellQuantity)
              ? " order-ticket__quick-chip--active"
              : ""
          }`}
          onClick={() => {
            const maxQuantity = orderDirection === "BUY" ? maxBuyQuantity : maxSellQuantity;
            if (maxQuantity > 0) {
              resetSubmissionFeedback();
              setQuantity(maxQuantity);
            }
          }}
        >
          Max
        </button>
      </div>

      <div className="ticket-balance-strip">
        <div>
          <span>Available</span>
          <strong data-testid="order-ticket-available-balance">
            {formatKes(state.walletBalanceKes)}
          </strong>
        </div>
        <div>
          <span>Reserved</span>
          <strong data-testid="order-ticket-reserved-balance">
            {formatKes(state.reservedBalanceKes)}
          </strong>
        </div>
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
            {orderDirection === "BUY" ? (
              <>
                Order <strong>{lastOrderId}</strong> is now holding {formatKes(estimatedValue)} in
                reserved funds for this market.
              </>
            ) : (
              <>
                Order <strong>{lastOrderId}</strong> is now resting {quantity} {contractSide} shares
                on the market at {Math.round(selectedPrice * 100)}c.
              </>
            )}
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
          <span>{summaryLabel}</span>
          <strong>{summaryValue}</strong>
        </div>
        <div>
          <span>{costLabel}</span>
          <strong>{formatKes(estimatedValue)}</strong>
        </div>
        <div>
          <span>{outcomeLabel}</span>
          <strong>{outcomeValue}</strong>
        </div>
      </div>

      <p className="panel-note order-ticket__note">
        {orderDirection === "BUY"
          ? "Submitting a buy order moves funds into reserved balance first. Fills can be partial during active trading."
          : "Submitting a sell order parks held shares on the market first. Fills can be partial during active trading."}
      </p>

      <button
        type="button"
        className="primary-button primary-button--block"
        onClick={() => void handlePrimaryAction()}
        disabled={isSyncingAccount || orderState === "submitting" || walletState === "funding"}
      >
        {actionLabel}
      </button>
    </aside>
  );
}
