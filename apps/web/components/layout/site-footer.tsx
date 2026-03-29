import Link from "next/link";
import { SokoOddsLogo } from "./sokoodds-logo";

export function SiteFooter() {
  return (
    <footer className="site-shell site-footer">
      <div className="site-footer__grid">
        <div>
          <div className="site-footer__mark">
            <SokoOddsLogo compact />
          </div>
          <p className="site-footer__lede">
            Kenya-first event markets with cleaner pricing, shorter labels, and M-Pesa-native wallet language.
          </p>
        </div>
        <div>
          <h3>Markets</h3>
          <div className="site-footer__link-grid">
            <Link href="/markets?category=Politics">Politics</Link>
            <Link href="/markets?category=Football">Football</Link>
            <Link href="/markets?category=Economy">Economy</Link>
            <Link href="/markets?category=Weather">Weather</Link>
            <Link href="/markets?category=Culture">Culture</Link>
            <Link href="/markets">View more</Link>
          </div>
        </div>
        <div>
          <h3>Wallet</h3>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/cash">Cash & deposit</Link>
          <Link href="/markets/nairobi-governor-bill-sign-before-june">Open a sample market</Link>
          <Link href="/help">Help Center</Link>
          <Link href="/market-integrity">Market Integrity</Link>
        </div>
        <div>
          <h3>Follow</h3>
          <div className="site-footer__social-row">
            <Link href="/help" aria-label="Email updates">
              Email
            </Link>
            <Link href="/docs" aria-label="Documentation updates">
              Docs
            </Link>
            <Link href="/leaderboard" aria-label="Leaderboard">
              Leaderboard
            </Link>
            <Link href="/portfolio" aria-label="Portfolio">
              Portfolio
            </Link>
          </div>
        </div>
      </div>

      <div className="site-footer__legal">
        <span>Adventure One QSS Inc. © 2026</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms of Use</Link>
          <Link href="/market-integrity">Market Integrity</Link>
          <Link href="/help">Help Center</Link>
          <Link href="/docs">Docs</Link>
        </div>
      </div>
    </footer>
  );
}
