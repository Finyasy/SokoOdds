import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function CashPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Cash & Deposit</span>
          <h1>Fund your wallet with M-Pesa first, Paybill when you need a fallback.</h1>
          <p>
            SokoOdds keeps wallet language simple: available cash is ready to trade, reserved cash
            is tied to open orders, and payouts return to your verified number after settlement.
          </p>
          <div className="filter-row">
            <Link href="/portfolio" className="ghost-button">
              Open portfolio
            </Link>
            <Link href="/help" className="ghost-button">
              Funding help
            </Link>
          </div>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>M-Pesa deposit flow</h3>
            <ul className="bullet-list">
              <li>Verify once with the same number you will use for withdrawals.</li>
              <li>Approve the STK push on your phone and the balance updates in your wallet.</li>
              <li>Use this path for the fastest funding and payout loop.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>Paybill fallback</h3>
            <ul className="bullet-list">
              <li>Use Paybill for larger top-ups or when STK push is delayed.</li>
              <li>Keep the wallet reference exact so support can reconcile funding quickly.</li>
              <li>Open Help Center if a transfer lands without reflecting in wallet cash.</li>
            </ul>
          </article>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Cash states</h3>
            <ul className="bullet-list">
              <li>Available cash can be used immediately on new orders.</li>
              <li>Reserved cash sits behind open or partially filled orders.</li>
              <li>Resolved winnings flow back into wallet cash after settlement completes.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>Recommended path</h3>
            <ul className="bullet-list">
              <li>Deposit through M-Pesa.</li>
              <li>Trade from a market page once the wallet is ready.</li>
              <li>Review reserved balance from portfolio if an order is still waiting to match.</li>
            </ul>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
