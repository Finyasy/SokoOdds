import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Privacy</span>
          <h1>Privacy language for account, wallet, and market activity.</h1>
          <p>
            This product preview keeps privacy copy simple: we only ask for the details needed to
            support M-Pesa verification, account security, support follow-up, and market
            participation records.
          </p>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Data we hold</h3>
            <ul className="bullet-list">
              <li>Name and phone details used for account and M-Pesa setup.</li>
              <li>Verification and wallet events needed for funding and withdrawal support.</li>
              <li>Order, position, and settlement activity tied to your trading account.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>How it is used</h3>
            <ul className="bullet-list">
              <li>To verify accounts and route payouts to the correct number.</li>
              <li>To support market integrity, audit trails, and dispute review.</li>
              <li>To improve product support, trust messaging, and wallet operations.</li>
            </ul>
            <div className="filter-row">
              <Link href="/help" className="ghost-button">
                Help Center
              </Link>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
