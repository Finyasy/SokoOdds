"use client";

import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "./onboarding-provider";

export function AccountAccessButton() {
  const { state, isSyncingAccount, openAccountSheet, openVerificationSheet } = useOnboarding();

  if (isSyncingAccount) {
    return (
      <button
        type="button"
        className="wallet-button wallet-button--pending"
        disabled
        data-testid="account-wallet-button"
      >
        <span className="wallet-button__label">Checking wallet</span>
        <strong>Loading...</strong>
      </button>
    );
  }

  if (state.isSignedIn && state.mpesaVerified) {
    const setupLabel =
      state.kycStatus === "approved"
        ? "M-Pesa ready · KYC approved"
        : state.kycStatus === "pending"
          ? "M-Pesa ready · KYC pending"
          : "M-Pesa ready";

    return (
      <button
        type="button"
        className="wallet-button"
        onClick={openVerificationSheet}
        data-testid="account-wallet-button"
      >
        <span className="wallet-button__label">{setupLabel}</span>
        <strong>{formatKes(state.walletBalanceKes)}</strong>
      </button>
    );
  }

  if (state.isSignedIn) {
    return (
      <button
        type="button"
        className="wallet-button wallet-button--pending"
        onClick={openVerificationSheet}
        data-testid="account-wallet-button"
      >
        <span className="wallet-button__label">Finish setup</span>
        <strong>Verify M-Pesa</strong>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="primary-button"
      onClick={openAccountSheet}
      data-testid="account-wallet-button"
    >
      Sign in to trade
    </button>
  );
}
