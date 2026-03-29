import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Terms of Use</span>
          <h1>Clear trading language for this product preview.</h1>
          <p>
            Use of SokoOdds assumes users understand that event markets can pause, close, resolve
            from named sources, and settle according to the market rules shown before trade.
          </p>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Trading basics</h3>
            <ul className="bullet-list">
              <li>Orders may submit, wait to match, partially fill, or be cancelled.</li>
              <li>Reserved wallet funds remain locked while open exposure exists.</li>
              <li>Resolved markets pay out according to the final outcome and market rules.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>Operational basics</h3>
            <ul className="bullet-list">
              <li>Markets may pause for source ambiguity, administrative review, or lifecycle changes.</li>
              <li>Verification and funding flows may require M-Pesa confirmation before trading.</li>
              <li>Support, docs, and market-integrity notes form part of the product guidance surface.</li>
            </ul>
            <div className="filter-row">
              <Link href="/market-integrity" className="ghost-button">
                Market Integrity
              </Link>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
