"use client";

import { SokoOddsBadge } from "@/components/layout/sokoodds-logo";
import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "./onboarding-provider";

export function AccountAccessButton() {
  const { state, isHydrated, isSyncingAccount, openAccountSheet, openVerificationSheet } =
    useOnboarding();

  if (!isHydrated) {
    return (
      <div className="auth-actions" data-testid="account-wallet-button">
        <button type="button" className="auth-link-button" onClick={openAccountSheet}>
          Log In
        </button>
        <button type="button" className="primary-button" onClick={openAccountSheet}>
          Sign Up
        </button>
      </div>
    );
  }

  if (isSyncingAccount) {
    return (
      <button
        type="button"
        className="wallet-button wallet-button--pending"
        disabled
        data-testid="account-wallet-button"
      >
        <SokoOddsBadge className="wallet-button__brand" alt="SokoOdds wallet" />
        <span className="wallet-button__content">
          <span className="wallet-button__label">Checking wallet</span>
          <strong>Loading...</strong>
        </span>
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
        <SokoOddsBadge className="wallet-button__brand" alt="SokoOdds wallet" />
        <span className="wallet-button__content">
          <span className="wallet-button__label">{setupLabel}</span>
          <strong>{formatKes(state.walletBalanceKes)}</strong>
        </span>
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
        <SokoOddsBadge className="wallet-button__brand" alt="SokoOdds wallet" />
        <span className="wallet-button__content">
          <span className="wallet-button__label">Finish setup</span>
          <strong>Verify M-Pesa</strong>
        </span>
      </button>
    );
  }

  return (
    <div className="auth-actions" data-testid="account-wallet-button">
      <button type="button" className="auth-link-button" onClick={openAccountSheet}>
        Log In
      </button>
      <button type="button" className="primary-button" onClick={openAccountSheet}>
        Sign Up
      </button>
    </div>
  );
}
