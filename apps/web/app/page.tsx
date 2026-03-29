import { SiteFooter } from "@/components/layout/site-footer";
import { MarketDiscoveryShell } from "@/components/market/market-discovery-shell";
import { getMarkets } from "@/lib/market-api";
import { homeHeroMarkets } from "@/lib/mock-data";
import {
  parseDiscoveryCategory,
  parseDiscoveryFocus,
  readSingleSearchParam
} from "@/lib/market-discovery";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    focus?: string | string[];
    q?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const markets = await getMarkets();
  const discoveryMarkets = markets;
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialCategory = parseDiscoveryCategory(readSingleSearchParam(resolvedSearchParams.category));
  const initialFocus = parseDiscoveryFocus(readSingleSearchParam(resolvedSearchParams.focus));
  const initialSearchQuery = readSingleSearchParam(resolvedSearchParams.q) ?? "";

  return (
    <>
      <MarketDiscoveryShell
        title="All markets"
        kicker="Live discovery"
        countQualifier="live"
        markets={discoveryMarkets}
        footerText="Built for quick scanning, public-source trust, and cleaner trade decisions."
        footerHref="/markets"
        footerLabel="Browse the full board"
        showMoreHref="/markets"
        showMoreLabel="Show more markets"
        initialCategory={initialCategory}
        initialFocus={initialFocus}
        initialSearchQuery={initialSearchQuery}
        showTrendingHero
        heroMarkets={homeHeroMarkets}
        syncDiscoveryToUrl
        showUrgentRail={false}
      />
      <SiteFooter />
    </>
  );
}
