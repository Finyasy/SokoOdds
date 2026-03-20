"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import type { Market } from "@/lib/mock-data";
import {
  filterDiscoveryMarkets,
  formatDiscoveryFocusLabel,
  type DiscoveryCategory,
  type DiscoveryFocus
} from "@/lib/market-discovery";
import { MarketBoard } from "./market-board";
import { MarketSignalStrip } from "./market-signal-strip";

type MarketDiscoveryShellProps = {
  title: string;
  kicker: string;
  countQualifier: string;
  markets: Market[];
  footerText: string;
  footerHref: string;
  footerLabel: string;
  initialCategory?: DiscoveryCategory;
  initialSearchQuery?: string;
  initialFocus?: DiscoveryFocus;
  showSignalStrip?: boolean;
};

export function MarketDiscoveryShell({
  title,
  kicker,
  countQualifier,
  markets,
  footerText,
  footerHref,
  footerLabel,
  initialCategory = "All",
  initialSearchQuery = "",
  initialFocus = "all",
  showSignalStrip = false
}: MarketDiscoveryShellProps) {
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeFocus, setActiveFocus] = useState<DiscoveryFocus>(initialFocus);
  const [isPending, startBoardTransition] = useTransition();
  const deferredCategory = useDeferredValue(activeCategory);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFocus = useDeferredValue(activeFocus);

  const filteredMarkets = useMemo(
    () => filterDiscoveryMarkets(markets, deferredCategory, deferredSearchQuery, deferredFocus),
    [deferredCategory, deferredFocus, deferredSearchQuery, markets]
  );

  const showSignals = showSignalStrip && deferredSearchQuery.trim() === "";
  const boardTitle =
    deferredFocus === "all"
      ? title
      : `${formatDiscoveryFocusLabel(deferredFocus)} ${
          deferredCategory === "All" ? "markets" : deferredCategory.toLowerCase()
        }`;
  const boardKicker = deferredFocus === "all" ? kicker : "Focused board";
  const boardCountQualifier = deferredFocus === "all" ? countQualifier : "matching";
  const isBoardTransitioning =
    isPending ||
    activeCategory !== deferredCategory ||
    activeFocus !== deferredFocus ||
    searchQuery !== deferredSearchQuery;

  return (
    <>
      <SiteHeader
        searchValue={searchQuery}
        onSearchChange={(value) => {
          startBoardTransition(() => {
            setSearchQuery(value);
          });
        }}
        activeMarketCategory={activeCategory}
        activeMarketFocus={activeFocus}
        onSelectMarketCategory={(value) => {
          startBoardTransition(() => {
            setActiveCategory(value);
          });
        }}
      />

      <main className="site-shell page-stack">
        {showSignals ? (
          <MarketSignalStrip
            markets={markets}
            activeCategory={deferredCategory}
            activeFocus={deferredFocus}
            onSelectSignalBoard={(focus, category) => {
              startBoardTransition(() => {
                setActiveFocus(focus);
                setActiveCategory(category);
              });
            }}
          />
        ) : null}

        <MarketBoard
          title={boardTitle}
          kicker={boardKicker}
          countQualifier={boardCountQualifier}
          filteredMarkets={filteredMarkets}
          activeFilter={deferredCategory}
          activeFocus={deferredFocus}
          searchQuery={searchQuery}
          isTransitioning={isBoardTransitioning}
          onFilterChange={(value) => {
            startBoardTransition(() => {
              setActiveCategory(value);
            });
          }}
          onClearDiscovery={() => {
            startBoardTransition(() => {
              setActiveCategory("All");
              setSearchQuery("");
              setActiveFocus("all");
            });
          }}
          footerText={footerText}
          footerHref={footerHref}
          footerLabel={footerLabel}
        />
      </main>
    </>
  );
}
