import { SiteFooter } from "@/components/layout/site-footer";
import { MarketDiscoveryShell } from "@/components/market/market-discovery-shell";
import { getMarkets } from "@/lib/market-api";
import { homeHeroMarkets } from "@/lib/mock-data";
import {
  parseDiscoveryCategory,
  parseDiscoveryFocus,
  readSingleSearchParam
} from "@/lib/market-discovery";

type MarketsPageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    focus?: string | string[];
    q?: string | string[];
  }>;
};

export default async function MarketsPage({ searchParams }: MarketsPageProps) {
  const markets = await getMarkets();
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialCategory = parseDiscoveryCategory(readSingleSearchParam(resolvedSearchParams.category));
  const initialFocus = parseDiscoveryFocus(readSingleSearchParam(resolvedSearchParams.focus));
  const initialSearchQuery = readSingleSearchParam(resolvedSearchParams.q) ?? "";

  return (
    <>
      <MarketDiscoveryShell
        title="All markets"
        kicker="Live catalogue"
        countQualifier="active board"
        markets={markets}
        footerText="A Kenya-first catalogue shaped for clean scanning, market identity, and clearer odds."
        footerHref="/markets/nairobi-governor-bill-sign-before-june"
        footerLabel="Open a featured market"
        initialCategory={initialCategory}
        initialFocus={initialFocus}
        initialSearchQuery={initialSearchQuery}
        showSignalStrip
        signalStripTone="catalog"
        syncDiscoveryToUrl
        showTrendingHero
        heroMarkets={homeHeroMarkets}
        showMoreHref="/markets?category=All"
        showMoreLabel="Show more markets"
        showUrgentRail={false}
        showBoardOverview
      />
      <SiteFooter />
    </>
  );
}
