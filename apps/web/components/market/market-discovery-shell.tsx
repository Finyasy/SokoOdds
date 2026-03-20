"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import type { Market } from "@/lib/mock-data";
import { filterDiscoveryMarkets, type DiscoveryCategory } from "@/lib/market-discovery";
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
  showSignalStrip = false
}: MarketDiscoveryShellProps) {
  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const filteredMarkets = useMemo(
    () => filterDiscoveryMarkets(markets, activeCategory, searchQuery),
    [activeCategory, markets, searchQuery]
  );

  const showSignals = showSignalStrip && activeCategory === "All" && searchQuery.trim() === "";

  return (
    <>
      <SiteHeader
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        activeMarketCategory={activeCategory}
        onSelectMarketCategory={setActiveCategory}
      />

      <main className="site-shell page-stack">
        {showSignals ? <MarketSignalStrip markets={markets} /> : null}

        <MarketBoard
          title={title}
          kicker={kicker}
          countQualifier={countQualifier}
          filteredMarkets={filteredMarkets}
          activeFilter={activeCategory}
          searchQuery={searchQuery}
          onFilterChange={setActiveCategory}
          onClearDiscovery={() => {
            setActiveCategory("All");
            setSearchQuery("");
          }}
          footerText={footerText}
          footerHref={footerHref}
          footerLabel={footerLabel}
        />
      </main>
    </>
  );
}
