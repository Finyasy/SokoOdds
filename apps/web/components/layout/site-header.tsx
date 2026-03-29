"use client";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { HeaderUtilityMenu } from "@/components/layout/header-utility-menu";
import { SokoOddsLogo } from "@/components/layout/sokoodds-logo";
import { AccountAccessButton } from "@/components/onboarding/account-access-button";
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

    return "Kenya-first event markets";
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
          <AccountAccessButton />
          <HeaderUtilityMenu />
        </div>
      </div>

      <nav className="site-nav" aria-label="Primary">
        {discoveryNavItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`site-nav__item${currentCategory === item.value ? " site-nav__item--active" : ""}`}
            onClick={() => handleCategorySelect(item.value)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
