import Link from "next/link";
import { AccountAccessButton } from "@/components/onboarding/account-access-button";

const navItems = [
  { href: "/markets", label: "Trending" },
  { href: "/markets", label: "Politics" },
  { href: "/markets", label: "Football" },
  { href: "/markets", label: "Economy" },
  { href: "/markets", label: "Weather" },
  { href: "/markets", label: "Culture" }
];

const WHATSAPP_ALERTS_URL =
  "https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp.";

export function SiteHeader() {
  return (
    <header className="site-shell site-header">
      <div className="site-header__row">
        <Link href="/" className="brand-mark">
          <span className="brand-mark__badge">SO</span>
          <span>
            <strong>SokoOdds</strong>
            <small>Kenya-first event markets</small>
          </span>
        </Link>

        <label className="site-search" aria-label="Search markets">
          <span className="site-search__icon">⌕</span>
          <input type="text" value="" readOnly placeholder="Search markets..." />
        </label>

        <div className="site-header__actions">
          <Link
            href={WHATSAPP_ALERTS_URL}
            target="_blank"
            rel="noreferrer"
            className="ghost-button ghost-button--whatsapp"
          >
            WhatsApp
          </Link>
          <AccountAccessButton />
        </div>
      </div>

      <nav className="site-nav" aria-label="Primary">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
