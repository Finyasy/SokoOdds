import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MarketRulesCard } from "@/components/market/market-rules-card";
import { OrderBook } from "@/components/market/order-book";
import { OrderTicket } from "@/components/market/order-ticket";
import { PositionSummaryCard } from "@/components/market/position-summary-card";
import { ProbabilityPill } from "@/components/market/probability-pill";
import { RecentTrades } from "@/components/market/recent-trades";
import { getMarketBySlug } from "@/lib/market-api";
import { formatClosingLabel, formatKes } from "@/lib/mock-data";

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);

  if (!market) {
    notFound();
  }

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
              <section className="market-intel-strip">
                <div>
                  <span className="market-intel-strip__eyebrow">Stay ahead of settlement</span>
                  <strong>
                    Join the WhatsApp alert lane for this market’s pauses, rule notices, and final
                    resolution update.
                  </strong>
                </div>
                <Link
                  href="https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp."
                  target="_blank"
                  rel="noreferrer"
                  className="ghost-button ghost-button--whatsapp"
                >
                  Join WhatsApp alerts
                </Link>
              </section>

              <section className="market-hero">
                <div className="market-hero__content">
                  <div className="market-hero__meta">
                    <span className="market-chip">{market.category}</span>
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

            <div className="market-stage__ticket">
              <OrderTicket market={market} />
            </div>
          </div>
        </section>

        <section className="market-layout">
          <div className="market-layout__main">
            <section className="panel market-summary">
              <div className="panel__header">
                <span className="market-chip">Market summary</span>
                <strong>Why this market is fair</strong>
              </div>
              <p className="panel-copy">
                This layout keeps trust next to action. Users can see the resolution source,
                status, price, close time, and payout framing before interacting with the ticket.
              </p>
              <div className="trust-note-list">
                {market.trustNotes.map((note) => (
                  <div key={note} className="trust-note">
                    {note}
                  </div>
                ))}
              </div>
            </section>

            <div className="two-column-panels">
              <OrderBook yesBids={market.orderBook.yesBids} noBids={market.orderBook.noBids} />
              <RecentTrades trades={market.trades} />
            </div>

            <div className="two-column-panels">
              <MarketRulesCard title="How this market resolves" items={market.ruleHighlights} />
              <MarketRulesCard title="Trust and monitoring notes" items={market.trustNotes} />
            </div>
          </div>

          <div className="market-layout__aside">
            <PositionSummaryCard />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
