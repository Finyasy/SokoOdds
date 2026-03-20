"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AccountAccessButton } from "@/components/onboarding/account-access-button";
import {
  buildDiscoveryHref,
  discoveryNavItems,
  type DiscoveryCategory
} from "@/lib/market-discovery";

type SiteHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  activeMarketCategory?: DiscoveryCategory;
  onSelectMarketCategory?: (value: DiscoveryCategory) => void;
};

const WHATSAPP_ALERTS_URL =
  "https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp.";

export function SiteHeader({
  searchValue,
  onSearchChange,
  activeMarketCategory,
  onSelectMarketCategory
}: SiteHeaderProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localSearchValue, setLocalSearchValue] = useState("");
  const [localCategory, setLocalCategory] = useState<DiscoveryCategory>("All");

  const currentSearchValue = searchValue ?? localSearchValue;
  const currentCategory = activeMarketCategory ?? localCategory;

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
        <Link href="/" className="brand-mark">
          <span className="brand-mark__badge">SO</span>
          <span>
            <strong>SokoOdds</strong>
            <small>Kenya-first event markets</small>
          </span>
        </Link>

        <form className="site-search" aria-label="Search markets" onSubmit={handleSearchSubmit}>
          <span className="site-search__icon">⌕</span>
          <input
            type="text"
            value={currentSearchValue}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search markets..."
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
          <Link
            href={WHATSAPP_ALERTS_URL}
            target="_blank"
            rel="noreferrer"
            className="ghost-button ghost-button--whatsapp"
          >
            WhatsApp
          </Link>
          <AccountAccessButton />
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
