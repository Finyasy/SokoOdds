import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketBoard } from "@/components/market/market-board";
import { getMarkets } from "@/lib/market-api";

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <MarketBoard
          title="All markets"
          kicker="Market board"
          countLabel={`${markets.length} active launch contracts`}
          markets={markets}
          footerText="Focused launch catalogue for politics, football, economy, weather, and culture."
          footerHref="/markets/nairobi-governor-bill-sign-before-june"
          footerLabel="Open sample market"
        />
      </main>
      <SiteFooter />
    </>
  );
}
