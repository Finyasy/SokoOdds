import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const quickLinks = [
  { label: "Portfolio", href: "/portfolio", meta: "Wallet, open orders, and fills" },
  { label: "Cash", href: "/cash", meta: "Deposits, withdrawals, and ledger activity" },
  { label: "Leaderboard", href: "/leaderboard", meta: "Track active traders and signals" },
  { label: "Documentation", href: "/docs", meta: "Product notes and current behavior" },
  { label: "Help Center", href: "/help", meta: "Funding and support guidance" }
];

export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="site-shell page-stack">
        <section className="portfolio-shell">
          <div className="cash-signin-card account-access-card">
            <div>
              <span className="section-kicker">Account</span>
              <h1>Open the part of SokoOdds you need next.</h1>
              <p>
                This fallback menu keeps the key account destinations reachable even if the compact
                header menu is unavailable in the current dev session.
              </p>
            </div>
          </div>
        </section>

        <section className="portfolio-grid">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="portfolio-card account-link-card">
              <div className="portfolio-card__head">
                <span className="market-chip">Open</span>
                <strong>{item.label}</strong>
              </div>
              <p className="portfolio-inline-note">{item.meta}</p>
            </Link>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
