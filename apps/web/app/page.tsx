import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketBoard } from "@/components/market/market-board";
import { MarketSignalStrip } from "@/components/market/market-signal-strip";
import { getMarkets } from "@/lib/market-api";

export default async function HomePage() {
  const markets = await getMarkets();
  const discoveryMarkets = markets.slice(0, 8);

  return (
      <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <MarketSignalStrip markets={markets} />
        <MarketBoard
          title="All markets"
          kicker="Live discovery"
          countLabel={`${discoveryMarkets.length} live contracts`}
          markets={discoveryMarkets}
          footerText="Smaller market set, clearer depth, faster scanning."
          footerHref="/markets"
          footerLabel="Show more markets"
        />
      </main>
      <SiteFooter />
    </>
  );
}
