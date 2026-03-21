import { SiteFooter } from "@/components/layout/site-footer";
import { MarketDiscoveryShell } from "@/components/market/market-discovery-shell";
import { getMarkets } from "@/lib/market-api";
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
        kicker="Market board"
        countQualifier="active launch"
        markets={markets}
        footerText="Focused launch catalogue for politics, football, economy, weather, and culture."
        footerHref="/markets/nairobi-governor-bill-sign-before-june"
        footerLabel="Open sample market"
        initialCategory={initialCategory}
        initialFocus={initialFocus}
        initialSearchQuery={initialSearchQuery}
        showSignalStrip
        signalStripTone="catalog"
      />
      <SiteFooter />
    </>
  );
}
