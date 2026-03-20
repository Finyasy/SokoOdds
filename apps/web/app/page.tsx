import { SiteFooter } from "@/components/layout/site-footer";
import { MarketDiscoveryShell } from "@/components/market/market-discovery-shell";
import { getMarkets } from "@/lib/market-api";
import { parseDiscoveryCategory, readSingleSearchParam } from "@/lib/market-discovery";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const markets = await getMarkets();
  const discoveryMarkets = markets.slice(0, 8);
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialCategory = parseDiscoveryCategory(readSingleSearchParam(resolvedSearchParams.category));
  const initialSearchQuery = readSingleSearchParam(resolvedSearchParams.q) ?? "";

  return (
    <>
      <MarketDiscoveryShell
        title="All markets"
        kicker="Live discovery"
        countQualifier="live"
        markets={discoveryMarkets}
        footerText="Smaller market set, clearer depth, faster scanning."
        footerHref="/markets"
        footerLabel="Show more markets"
        initialCategory={initialCategory}
        initialSearchQuery={initialSearchQuery}
        showSignalStrip
      />
      <SiteFooter />
    </>
  );
}
