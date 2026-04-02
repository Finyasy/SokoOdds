"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SokoOddsBadge } from "@/components/layout/sokoodds-logo";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 7.5 4.5 5 4.5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type MenuAction = {
  label: string;
  meta?: string;
  href?: string;
};

export function HeaderUtilityMenu() {
  const { state, openAccountSheet, openVerificationSheet } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("sokoodds.theme") === "dark";
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const theme = isDarkMode ? "dark" : "light";
    window.localStorage.setItem("sokoodds.theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [isDarkMode]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const menuActions: MenuAction[] = [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Dark mode", meta: "Toggle" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Cash balance", href: "/cash" },
    { label: "Deposit via M-Pesa" },
    { label: "Deposit via Paybill" },
    { label: "Documentation", href: "/docs" },
    { label: "Help Center", href: "/help" }
  ];

  function handlePrimaryAction(label: string) {
    setIsOpen(false);

    if (label === "Dark mode") {
      setIsDarkMode((current) => !current);
      return;
    }

    if (label === "Deposit via M-Pesa" || label === "Deposit via Paybill") {
      if (state.isSignedIn) {
        openVerificationSheet();
      } else {
        openAccountSheet();
      }
    }
  }

  return (
    <div className={`header-menu${isOpen ? " header-menu--open" : ""}`} ref={menuRef}>
      <Link
        href="/account"
        className="header-menu__trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account and product menu"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((current) => !current);
        }}
      >
        <SokoOddsBadge className="header-menu__avatar" alt="SokoOdds menu avatar" />
        <ChevronDownIcon />
        <MenuIcon />
      </Link>

      {isOpen ? (
        <div className="header-menu__panel" role="menu">
          <div className="header-menu__summary">
            <div>
              <span>Portfolio</span>
              <strong>
                {state.isSignedIn ? `Ksh ${state.reservedBalanceKes.toLocaleString()}` : "Ksh 0.00"}
              </strong>
            </div>
            <div>
              <span>Cash</span>
              <strong>
                {state.isSignedIn ? `Ksh ${state.walletBalanceKes.toLocaleString()}` : "Ksh 0.00"}
              </strong>
            </div>
            <button
              type="button"
              className="primary-button header-menu__deposit"
              onClick={() => {
                setIsOpen(false);
                state.isSignedIn ? openVerificationSheet() : openAccountSheet();
              }}
            >
              Deposit
            </button>
          </div>

          <div className="header-menu__section-label">Funding</div>
          <div className="header-menu__funding-note">Use M-Pesa STK push or Paybill once your wallet is ready.</div>

          <div className="header-menu__items">
            {menuActions.map((item) => (
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="header-menu__item"
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.meta ? <em>{item.meta}</em> : null}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="header-menu__item"
                  role="menuitem"
                  onClick={() => handlePrimaryAction(item.label)}
                >
                  <span>{item.label}</span>
                  <em>{item.label === "Dark mode" ? (isDarkMode ? "On" : "Off") : item.meta}</em>
                </button>
              )
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
