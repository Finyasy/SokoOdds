import Link from "next/link";
import { SokoOddsLogo } from "./sokoodds-logo";

function EmailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="m2 4 8 6 8-6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M11.47 8.85 16.9 2.5h-1.28l-4.72 5.5L7.18 2.5H2.5l5.7 8.3L2.5 17.5h1.28l4.98-5.79 3.98 5.79H17.5l-6.03-8.65Zm-1.76 2.05-.58-.83L4.4 3.52h1.98l3.72 5.32.58.83 4.84 6.93h-1.98l-3.93-5.7Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M14.5 2h-2.28a3.75 3.75 0 0 0 3.53 3.72V8a5.94 5.94 0 0 1-3.5-1.13v5.38a4.75 4.75 0 1 1-4.75-4.75v2.28a2.47 2.47 0 1 0 2.47 2.47V2H14.5Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M15.53 5.16a13 13 0 0 0-3.24-.99l-.15.3a11.86 11.86 0 0 0-4.28 0l-.15-.3a13 13 0 0 0-3.24 1A16 16 0 0 0 2.2 14.98a13.1 13.1 0 0 0 4.03 2.02l.51-.7a8.5 8.5 0 0 1-1.34-.65l.14-.11a9.3 9.3 0 0 0 8.92 0l.14.11a8.5 8.5 0 0 1-1.34.65l.51.7a13.1 13.1 0 0 0 4.03-2.02 16 16 0 0 0-2.27-9.82ZM7.63 13.08c-.85 0-1.55-.8-1.55-1.77s.68-1.77 1.55-1.77 1.56.8 1.55 1.77c0 .97-.69 1.77-1.55 1.77Zm4.74 0c-.86 0-1.55-.8-1.55-1.77s.68-1.77 1.55-1.77c.86 0 1.56.8 1.55 1.77 0 .97-.69 1.77-1.55 1.77Z" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-shell site-footer">
      <div className="site-footer__grid">
        <div>
          <div className="site-footer__mark">
            <SokoOddsLogo compact />
          </div>
          <p className="site-footer__tagline">Kenya-first event markets</p>
          <p className="site-footer__lede">
            Cleaner pricing, shorter labels, and M-Pesa-native wallets.
          </p>
          <div className="site-footer__social-icons">
            <Link href="/help" aria-label="Email"><EmailIcon /></Link>
            <Link href="/help" aria-label="X (Twitter)"><XIcon /></Link>
            <Link href="/help" aria-label="TikTok"><TikTokIcon /></Link>
            <Link href="/help" aria-label="Discord"><DiscordIcon /></Link>
          </div>
        </div>
        <div>
          <h3>Markets by category</h3>
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
          <h3>Support & social</h3>
          <Link href="/help">Help Center</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/market-integrity">Market Integrity</Link>
          <Link href="/help">Contact us</Link>
        </div>
        <div>
          <h3>SokoOdds</h3>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/cash">Cash & deposit</Link>
          <Link href="/leaderboard">Rewards</Link>
          <Link href="/docs">APIs</Link>
          <Link href="/help">Careers</Link>
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

      <p className="site-footer__disclaimer">
        SokoOdds is operated by Adventure One QSS Inc. This platform operates as an event-based
        prediction market. Trading involves risk of loss. See our{" "}
        <Link href="/terms">Terms of Service</Link> &{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </footer>
  );
}
