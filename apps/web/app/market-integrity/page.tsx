import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function MarketIntegrityPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Market Integrity</span>
          <h1>Named sources, visible rules, and auditable settlement.</h1>
          <p>
            SokoOdds markets are designed to resolve from public, named evidence with clear rule
            highlights, pause controls, and a visible record of how the final outcome was reached.
          </p>
          <div className="filter-row">
            <Link href="/docs" className="ghost-button">
              Read docs
            </Link>
            <Link href="/help" className="ghost-button">
              Get support
            </Link>
          </div>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>How integrity works</h3>
            <ul className="bullet-list">
              <li>Each market names its resolution source before trade.</li>
              <li>Rule highlights stay visible near the ticket and order flow.</li>
              <li>High-risk or disputed outcomes can pause before final settlement.</li>
              <li>Final resolution notes explain the source used and why it counted.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>What users should expect</h3>
            <ul className="bullet-list">
              <li>Macro, politics, and weather markets may stay open until official publications land.</li>
              <li>Sports and culture markets resolve only from official tables, promoters, or named records.</li>
              <li>Settlement speed is secondary to source quality when the two conflict.</li>
            </ul>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
