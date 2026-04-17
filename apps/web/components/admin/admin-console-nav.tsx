"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_LINKS = [
  {
    href: "/admin/markets",
    label: "Market comments"
  },
  {
    href: "/admin/kyc",
    label: "KYC queue"
  },
  {
    href: "/admin/support",
    label: "Money support"
  }
];

export function AdminConsoleNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-console-nav" aria-label="Admin console">
      {ADMIN_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`admin-console-nav__link${pathname === item.href ? " admin-console-nav__link--active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
