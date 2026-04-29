import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketDetailExperience } from "@/components/market/market-detail-experience";
import { MarketIdentity } from "@/components/market/market-identity";
import { OrderTicket } from "@/components/market/order-ticket";
import { ProbabilityChart } from "@/components/market/probability-chart";
import { ProbabilityPill } from "@/components/market/probability-pill";
import {
  getMarketBySlug,
  getMarketCommentsBySlug,
  getMarketTopHoldersBySlug,
} from "@/lib/market-api";
import { formatClosingLabel, formatKes, getRelatedMarketsForMarket } from "@/lib/mock-data";

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  noStore();
  const { slug } = await params;
  const [market, comments, topHolders] = await Promise.all([
    getMarketBySlug(slug),
    getMarketCommentsBySlug(slug),
    getMarketTopHoldersBySlug(slug),
  ]);

  if (!market) {
    notFound();
  }

  const relatedMarkets = getRelatedMarketsForMarket(market, 3);

  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="market-stage">
          <div className="market-stage__header">
            <nav className="breadcrumb">
              <Link href="/markets">Markets</Link>
              <span>/</span>
              <span>{market.category}</span>
            </nav>
            <span className="market-stage__header-note">Resolution source visible before trade</span>
          </div>

          <div className="market-stage__body">
            <div className="market-stage__main">
              <section className="market-hero">
                <div className="market-hero__content">
                  <div className="market-hero__meta">
                    <div className="market-hero__identity-row">
                      <MarketIdentity market={market} size="lg" />
                      <div className="market-hero__identity-copy">
                        <span className="market-chip">{market.category}</span>
                        <span className="market-hero__region">{market.region}</span>
                      </div>
                    </div>
                    <span
                      className={`status-pill status-pill--${market.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {market.status}
                    </span>
                  </div>
                  <h1>{market.question}</h1>
                  <p>{market.summary}</p>

                  <div className="market-hero__probabilities">
                    <ProbabilityPill label="YES" value={market.yesPrice} />
                    <ProbabilityPill label="NO" value={market.noPrice} tone="no" />
                  </div>

                  <ProbabilityChart history={market.history} value={market.yesPrice} variant="detail" />

                  <div className="market-hero__stats">
                    <div>
                      <span>Volume</span>
                      <strong>{formatKes(market.volumeKes)}</strong>
                    </div>
                    <div>
                      <span>Liquidity</span>
                      <strong>{formatKes(market.liquidityKes)}</strong>
                    </div>
                    <div>
                      <span>Closes</span>
                      <strong>{formatClosingLabel(market.closesAt)}</strong>
                    </div>
                    <div>
                      <span>Resolution source</span>
                      <strong>{market.resolutionSource}</strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="market-stage__ticket" id="trade-ticket">
              <OrderTicket market={market} />
            </div>
          </div>
        </section>

        <MarketDetailExperience
          market={market}
          relatedMarkets={relatedMarkets}
          comments={comments}
          topHolders={topHolders}
        />

        <div className="mobile-trade-bar" aria-label="Mobile trade shortcut">
          <div className="mobile-trade-bar__prices">
            <span className="mobile-trade-bar__price mobile-trade-bar__price--yes">
              YES {Math.round(market.yesPrice * 100)}%
            </span>
            <span className="mobile-trade-bar__price mobile-trade-bar__price--no">
              NO {Math.round(market.noPrice * 100)}%
            </span>
          </div>
          <a href="#trade-ticket" className="primary-button mobile-trade-bar__action">
            Trade
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
