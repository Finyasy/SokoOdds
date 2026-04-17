import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function LeaderboardPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="page-hero">
          <span className="page-hero__eyebrow market-chip">Leaderboard</span>
          <h1>Top traders, steady performers, and the sharpest readers of East Africa's markets.</h1>
          <p>
            This surface ranks more than raw wins: consistency, fill quality, market participation,
            and disciplined risk-taking all matter in a healthier prediction market.
          </p>
          <div className="filter-row">
            <Link href="/portfolio" className="ghost-button">
              Open portfolio
            </Link>
            <Link href="/markets" className="ghost-button">
              Browse markets
            </Link>
          </div>
        </section>

        <section className="two-column-panels">
          <article className="panel">
            <h3>Planned leaderboard views</h3>
            <ul className="bullet-list">
              <li>Top P&amp;L over rolling periods.</li>
              <li>Most consistent traders by hit rate and discipline.</li>
              <li>Most active market readers across politics, football, economy, weather, and culture.</li>
            </ul>
          </article>
          <article className="panel">
            <h3>Why this matters</h3>
            <ul className="bullet-list">
              <li>The board should reward signal quality, not only one-off risk.</li>
              <li>Users need social proof that the market has depth and recurring participation.</li>
              <li>Leaderboard language should feel serious and data-led, not casino-like.</li>
            </ul>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
