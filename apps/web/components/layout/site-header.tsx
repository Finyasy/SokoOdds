import Link from "next/link";
import { AccountAccessButton } from "@/components/onboarding/account-access-button";

const navItems = [
  { href: "/markets", label: "Markets" },
  { href: "/markets", label: "How It Works" },
  { href: "/markets", label: "Trust" },
  { href: "/markets", label: "Wallet" }
];

const WHATSAPP_ALERTS_URL =
  "https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp.";

export function SiteHeader() {
  return (
    <header className="site-shell site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-mark__badge">SO</span>
        <span>
          <strong>SokoOdds</strong>
          <small>Kenya-first event markets</small>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="site-header__actions">
        <Link href={WHATSAPP_ALERTS_URL} target="_blank" rel="noreferrer" className="ghost-button ghost-button--whatsapp">
          WhatsApp alerts
        </Link>
        <Link href="/markets" className="ghost-button">
          Browse markets
        </Link>
        <Link href="/markets/nairobi-governor-bill-sign-before-june" className="ghost-button">
          Open sample market
        </Link>
        <AccountAccessButton />
      </div>
    </header>
  );
}
