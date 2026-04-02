"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import type { Market } from "@/lib/mock-data";
import {
  buildDiscoveryHref,
  filterDiscoveryMarkets,
  formatDiscoveryFocusLabel,
  type DiscoveryCategory,
  type DiscoveryFocus
} from "@/lib/market-discovery";
import { MarketBoard } from "./market-board";
import { MarketForYouHub } from "./market-for-you-hub";
import { MarketSignalStrip } from "./market-signal-strip";
import { TrendingHeroCarousel } from "./trending-hero-carousel";

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
  signalStripTone?: "home" | "catalog";
  syncDiscoveryToUrl?: boolean;
  showTrendingHero?: boolean;
  heroMarkets?: Market[];
  showMoreHref?: string;
  showMoreLabel?: string;
  showUrgentRail?: boolean;
  showBoardOverview?: boolean;
  showForYouHub?: boolean;
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
  showSignalStrip = false,
  signalStripTone = "home",
  syncDiscoveryToUrl = false,
  showTrendingHero = false,
  heroMarkets,
  showMoreHref,
  showMoreLabel,
  showUrgentRail = true,
  showBoardOverview = false,
  showForYouHub = false
}: MarketDiscoveryShellProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  function syncDiscoveryUrl(
    category: DiscoveryCategory,
    query: string,
    focus: DiscoveryFocus
  ) {
    if (!syncDiscoveryToUrl) {
      return;
    }

    router.replace(buildDiscoveryHref(pathname, category, query, focus), { scroll: false });
  }

  return (
    <>
      <SiteHeader
        searchValue={searchQuery}
        onSearchChange={(value) => {
          startBoardTransition(() => {
            setSearchQuery(value);
            syncDiscoveryUrl(activeCategory, value, activeFocus);
          });
        }}
        activeMarketCategory={activeCategory}
        activeMarketFocus={activeFocus}
        onSelectMarketCategory={(value) => {
          startBoardTransition(() => {
            setActiveCategory(value);
            syncDiscoveryUrl(value, searchQuery, activeFocus);
          });
        }}
      />

      <main className="site-shell page-stack">
        {showForYouHub ? <MarketForYouHub markets={markets} /> : null}
        {showTrendingHero ? <TrendingHeroCarousel markets={heroMarkets ?? markets} /> : null}

        {showSignals ? (
          <MarketSignalStrip
            markets={markets}
            activeCategory={deferredCategory}
            activeFocus={deferredFocus}
            tone={signalStripTone}
            onSelectSignalBoard={(focus, category) => {
              startBoardTransition(() => {
                setActiveFocus(focus);
                setActiveCategory(category);
                syncDiscoveryUrl(category, searchQuery, focus);
              });
            }}
          />
        ) : null}

        <MarketBoard
          title={boardTitle}
          kicker={boardKicker}
          countQualifier={boardCountQualifier}
          filteredMarkets={filteredMarkets}
          allMarkets={markets}
          activeFilter={deferredCategory}
          activeFocus={deferredFocus}
          searchQuery={searchQuery}
          isTransitioning={isBoardTransitioning}
          onFilterChange={(value) => {
            startBoardTransition(() => {
              setActiveCategory(value);
              syncDiscoveryUrl(value, searchQuery, activeFocus);
            });
          }}
          onClearDiscovery={() => {
            startBoardTransition(() => {
              setActiveCategory("All");
              setSearchQuery("");
              setActiveFocus("all");
              syncDiscoveryUrl("All", "", "all");
            });
          }}
          footerText={footerText}
          footerHref={footerHref}
          footerLabel={footerLabel}
          showMoreHref={showMoreHref}
          showMoreLabel={showMoreLabel}
          showUrgentRail={showUrgentRail}
          showBoardOverview={showBoardOverview}
        />
      </main>
    </>
  );
}
