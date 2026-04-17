import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function DocsPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Documentation</span>
          <h1>Documentation for East Africa's premier prediction market.</h1>
          <p>
            Use this area for the live contract surface behind the platform: API contracts,
            realtime behavior, UI direction, and trust rules that shape how the market behaves.
          </p>
          <div className="filter-row">
            <Link href="/markets" className="ghost-button">
              Open market board
            </Link>
            <Link href="/help" className="ghost-button">
              Help Center
            </Link>
          </div>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Core product docs</h3>
            <ul className="bullet-list">
              <li>Core API contracts for idempotency, order intake, WebSocket events, and workers.</li>
              <li>UI direction for homepage, market detail, identity media, and responsive behavior.</li>
              <li>Resolution and market-integrity notes for source handling and settlement state.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>How to use this surface</h3>
            <ul className="bullet-list">
              <li>Docs should match the product, not drift from it.</li>
              <li>Design notes should stay implementation-ready and East Africa-ready.</li>
              <li>Operational docs should make support, wallet, and settlement behavior easy to explain.</li>
            </ul>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
