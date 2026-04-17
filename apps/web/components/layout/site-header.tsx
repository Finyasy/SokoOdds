"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, MouseEvent } from "react";
import { useState, useTransition } from "react";
import { HeaderUtilityMenu } from "@/components/layout/header-utility-menu";
import { SokoOddsLogo } from "@/components/layout/sokoodds-logo";
import { AccountAccessButton } from "@/components/onboarding/account-access-button";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { formatKes } from "@/lib/mock-data";
import {
  buildDiscoveryHref,
  discoveryNavItems,
  formatDiscoveryBoardScope,
  formatDiscoveryFocusLabel,
  formatDiscoverySearchPlaceholder,
  type DiscoveryCategory,
  type DiscoveryFocus
} from "@/lib/market-discovery";

type SiteHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  activeMarketCategory?: DiscoveryCategory;
  activeMarketFocus?: DiscoveryFocus;
  onSelectMarketCategory?: (value: DiscoveryCategory) => void;
};

export function SiteHeader({
  searchValue,
  onSearchChange,
  activeMarketCategory,
  activeMarketFocus = "all",
  onSelectMarketCategory
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, openAccountSheet, openVerificationSheet } = useOnboarding();
  const [, startTransition] = useTransition();
  const [localSearchValue, setLocalSearchValue] = useState("");
  const [localCategory, setLocalCategory] = useState<DiscoveryCategory>("All");

  const currentSearchValue = searchValue ?? localSearchValue;
  const currentCategory = activeMarketCategory ?? localCategory;
  const trimmedSearchValue = currentSearchValue.trim();
  const searchPlaceholder = formatDiscoverySearchPlaceholder(currentCategory, activeMarketFocus);

  function formatHeaderContext() {
    if (trimmedSearchValue) {
      return `Searching “${trimmedSearchValue}” in ${formatDiscoveryBoardScope(
        currentCategory,
        activeMarketFocus
      )}`;
    }

    if (activeMarketFocus !== "all") {
      const focusLabel = formatDiscoveryFocusLabel(activeMarketFocus).toLowerCase();
      if (currentCategory === "All") {
        return `Viewing ${focusLabel} markets`;
      }

      return `Viewing ${focusLabel} ${currentCategory.toLowerCase()} board`;
    }

    if (currentCategory !== "All") {
      return `Viewing ${currentCategory.toLowerCase()} board`;
    }

    return "East Africa's Premier Prediction Market";
  }

  function updateSearch(value: string) {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setLocalSearchValue(value);
  }

  function handleCategorySelect(category: DiscoveryCategory) {
    if (onSelectMarketCategory) {
      onSelectMarketCategory(category);
      return;
    }

    setLocalCategory(category);
    startTransition(() => {
      router.push(buildDiscoveryHref("/markets", category, currentSearchValue));
    });
  }

  function handleNavItemClick(
    event: MouseEvent<HTMLAnchorElement>,
    category: DiscoveryCategory
  ) {
    if (pathname !== "/markets" && !pathname.startsWith("/markets/")) {
      return;
    }

    event.preventDefault();
    handleCategorySelect(category);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (onSearchChange) {
      return;
    }

    startTransition(() => {
      router.push(buildDiscoveryHref("/markets", currentCategory, currentSearchValue));
    });
  }

  return (
    <header className="site-shell site-header">
      <div className="site-header__row">
        <SokoOddsLogo subtitle={formatHeaderContext()} />

        <form className="site-search" aria-label="Search markets" onSubmit={handleSearchSubmit}>
          <span className="site-search__icon">⌕</span>
          <input
            type="text"
            value={currentSearchValue}
            onChange={(event) => updateSearch(event.target.value)}
            aria-label="Market search input"
            placeholder={searchPlaceholder}
          />
          {currentSearchValue ? (
            <button
              type="button"
              className="site-search__clear"
              aria-label="Clear market search"
              onClick={() => updateSearch("")}
            >
              Clear
            </button>
          ) : null}
        </form>

        <div className="site-header__actions">
          {state.isSignedIn && state.mpesaVerified ? (
            <div className="header-balance-strip" data-testid="account-wallet-button">
              <span className="sr-only">
                {state.kycStatus === "approved"
                  ? "M-Pesa ready · KYC approved"
                  : state.kycStatus === "pending"
                    ? "M-Pesa ready · KYC pending"
                    : "M-Pesa ready"}
              </span>
              <Link href="/portfolio" className="header-balance-strip__item">
                <span>Portfolio</span>
                <strong>{formatKes(state.reservedBalanceKes)}</strong>
              </Link>
              <Link href="/cash" className="header-balance-strip__item">
                <span>Cash</span>
                <strong>{formatKes(state.walletBalanceKes)}</strong>
              </Link>
              <button
                type="button"
                className="header-deposit-button"
                onClick={() => openVerificationSheet()}
              >
                Deposit
              </button>
            </div>
          ) : (
            <AccountAccessButton />
          )}
          <HeaderUtilityMenu />
        </div>
      </div>

      <nav className="site-nav" aria-label="Primary">
        {discoveryNavItems.map((item) => (
          <Link
            key={item.label}
            href={buildDiscoveryHref("/markets", item.value, currentSearchValue, activeMarketFocus)}
            className={`site-nav__item${currentCategory === item.value ? " site-nav__item--active" : ""}`}
            onClick={(event) => handleNavItemClick(event, item.value)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
