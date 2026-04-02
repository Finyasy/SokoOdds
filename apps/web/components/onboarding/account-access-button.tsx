"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { SokoOddsBadge } from "@/components/layout/sokoodds-logo";
import { formatKes } from "@/lib/mock-data";
import { useOnboarding } from "./onboarding-provider";

export function AccountAccessButton() {
  const { state, isHydrated, isSyncingAccount, openAccountSheet, openVerificationSheet } =
    useOnboarding();

  function handleAccountLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    action: "account" | "verify"
  ) {
    event.preventDefault();
    if (action === "verify") {
      openVerificationSheet();
      return;
    }
    openAccountSheet();
  }

  if (!isHydrated) {
    return (
      <div className="auth-actions" data-testid="account-wallet-button">
        <Link href="/account/access?mode=login" className="auth-link-button">
          Log In
        </Link>
        <Link href="/account/access?mode=signup" className="primary-button">
          Sign Up
        </Link>
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
      <Link
        href="/account/access?mode=wallet"
        className="wallet-button"
        onClick={(event) => handleAccountLinkClick(event, "verify")}
        data-testid="account-wallet-button"
      >
        <SokoOddsBadge className="wallet-button__brand" alt="SokoOdds wallet" />
        <span className="wallet-button__content">
          <span className="wallet-button__label">{setupLabel}</span>
          <strong>{formatKes(state.walletBalanceKes)}</strong>
        </span>
      </Link>
    );
  }

  if (state.isSignedIn) {
    return (
      <Link
        href="/account/access?mode=wallet"
        className="wallet-button wallet-button--pending"
        onClick={(event) => handleAccountLinkClick(event, "verify")}
        data-testid="account-wallet-button"
      >
        <SokoOddsBadge className="wallet-button__brand" alt="SokoOdds wallet" />
        <span className="wallet-button__content">
          <span className="wallet-button__label">Finish setup</span>
          <strong>Verify M-Pesa</strong>
        </span>
      </Link>
    );
  }

  return (
    <div className="auth-actions" data-testid="account-wallet-button">
      <Link
        href="/account/access?mode=login"
        className="auth-link-button"
        onClick={(event) => handleAccountLinkClick(event, "account")}
      >
        Log In
      </Link>
      <Link
        href="/account/access?mode=signup"
        className="primary-button"
        onClick={(event) => handleAccountLinkClick(event, "account")}
      >
        Sign Up
      </Link>
    </div>
  );
}
