import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Help Center</span>
          <h1>Help for funding, verification, payouts, and event settlement.</h1>
          <p>
            Find the fastest path through M-Pesa wallet setup, KES 5 verification, reserved-balance
            questions, and settlement-source guidance.
          </p>
          <div className="filter-row">
            <Link href="/portfolio" className="ghost-button">
              Open portfolio
            </Link>
            <Link href="/market-integrity" className="ghost-button">
              Market integrity
            </Link>
          </div>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Wallet and M-Pesa help</h3>
            <ul className="bullet-list">
              <li>Use the same number for verification and future withdrawals.</li>
              <li>The first KES 5 verification amount is credited back to your wallet after success.</li>
              <li>If an STK push fails, retry from the wallet sheet rather than changing markets.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>Trading and settlement help</h3>
            <ul className="bullet-list">
              <li>Open orders reserve funds until they match or you cancel them.</li>
              <li>Partially filled orders keep only the remaining unmatched balance reserved.</li>
              <li>Markets resolve from the named source shown on the market page, not social chatter.</li>
            </ul>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
