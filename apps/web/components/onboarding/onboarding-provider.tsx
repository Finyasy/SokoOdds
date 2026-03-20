"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  createAccountSession,
  fetchCurrentAccount,
  submitOrder as submitOrderRequest,
  type AccountSnapshot,
  type OrderSubmissionPayload,
  verifyMpesaWallet
} from "@/lib/account-client";

const STORAGE_KEY = "sokoodds.onboarding";
const WHATSAPP_ALERTS_URL =
  "https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp.";

type OnboardingState = {
  hasSeenWhatsAppPrompt: boolean;
  joinedWhatsApp: boolean;
  isSignedIn: boolean;
  name: string;
  phone: string;
  mpesaVerified: boolean;
  walletBalanceKes: number;
  reservedBalanceKes: number;
};

type AccountSheetView = "closed" | "account" | "verify";
type VerificationState = "idle" | "submitting-account" | "sending" | "sent";

type OnboardingContextValue = {
  state: OnboardingState;
  isHydrated: boolean;
  isSyncingAccount: boolean;
  accountSheetView: AccountSheetView;
  accountError: string | null;
  openAccountSheet: () => void;
  openVerificationSheet: () => void;
  closeAccountSheet: () => void;
  submitAccountProfile: (input: { name: string; phone: string }) => Promise<void>;
  requestVerification: (phone: string) => Promise<void>;
  submitOrder: (
    input: OrderSubmissionPayload
  ) => Promise<{ orderId: string; idempotencyStatus: string | null }>;
  dismissWhatsAppPrompt: () => void;
  joinWhatsAppAlerts: () => void;
  showWhatsAppPrompt: boolean;
  verificationState: VerificationState;
  whatsappUrl: string;
};

const DEFAULT_STATE: OnboardingState = {
  hasSeenWhatsAppPrompt: false,
  joinedWhatsApp: false,
  isSignedIn: false,
  name: "",
  phone: "",
  mpesaVerified: false,
  walletBalanceKes: 0,
  reservedBalanceKes: 0
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function loadStoredState(): Partial<OnboardingState> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      hasSeenWhatsAppPrompt: parsed.hasSeenWhatsAppPrompt ?? false,
      joinedWhatsApp: parsed.joinedWhatsApp ?? false
    };
  } catch {
    return {};
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return `0${digits.slice(3, 12)}`;
  }

  if (digits.startsWith("7") && digits.length >= 9) {
    return `0${digits.slice(0, 9)}`;
  }

  if (digits.startsWith("0")) {
    return digits.slice(0, 10);
  }

  return digits.slice(0, 10);
}

function accountSnapshotToState(snapshot: AccountSnapshot) {
  return {
    isSignedIn: true,
    name: snapshot.user.firstName,
    phone: snapshot.user.mpesaPhone ?? snapshot.user.phone,
    mpesaVerified: snapshot.user.mpesaVerified,
    walletBalanceKes: Number(snapshot.wallet.availableBalanceKes),
    reservedBalanceKes: Number(snapshot.wallet.reservedBalanceKes)
  };
}

function generateIdempotencyKey() {
  if (typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `sokoodds-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncingAccount, setIsSyncingAccount] = useState(true);
  const [accountSheetView, setAccountSheetView] = useState<AccountSheetView>("closed");
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadStoredState();
    setState((current) => ({
      ...current,
      ...stored
    }));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hasSeenWhatsAppPrompt: state.hasSeenWhatsAppPrompt,
        joinedWhatsApp: state.joinedWhatsApp
      })
    );
  }, [isHydrated, state.hasSeenWhatsAppPrompt, state.joinedWhatsApp]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isCancelled = false;
    setIsSyncingAccount(true);

    void fetchCurrentAccount()
      .then((account) => {
        if (isCancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          ...(account ? accountSnapshotToState(account) : accountSnapshotToStateCleared())
        }));
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          ...accountSnapshotToStateCleared()
        }));
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSyncingAccount(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!pathname.startsWith("/markets/") || state.hasSeenWhatsAppPrompt) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowWhatsAppPrompt(true);
    }, 550);

    return () => window.clearTimeout(timer);
  }, [isHydrated, pathname, state.hasSeenWhatsAppPrompt]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      isHydrated,
      isSyncingAccount,
      accountSheetView,
      showWhatsAppPrompt,
      verificationState,
      whatsappUrl: WHATSAPP_ALERTS_URL,
      accountError,
      openAccountSheet: () => {
        setAccountError(null);
        setVerificationState("idle");
        setAccountSheetView(state.isSignedIn ? "verify" : "account");
      },
      openVerificationSheet: () => {
        setAccountError(null);
        setVerificationState(state.mpesaVerified ? "sent" : "idle");
        setAccountSheetView("verify");
      },
      closeAccountSheet: () => {
        if (verificationState === "sending" || verificationState === "submitting-account") {
          return;
        }
        setAccountError(null);
        setAccountSheetView("closed");
        setVerificationState(state.mpesaVerified ? "sent" : "idle");
      },
      submitAccountProfile: async ({ name, phone }) => {
        setAccountError(null);
        setVerificationState("submitting-account");

        try {
          const account = await createAccountSession({
            firstName: name.trim(),
            phone: normalizePhone(phone)
          });

          setState((current) => ({
            ...current,
            ...accountSnapshotToState(account)
          }));
          setVerificationState("idle");
          setAccountSheetView("verify");
        } catch (error) {
          setVerificationState("idle");
          setAccountError(
            error instanceof Error ? error.message : "Could not start the account setup."
          );
        }
      },
      requestVerification: async (phone) => {
        setAccountError(null);
        setVerificationState("sending");

        try {
          const result = await verifyMpesaWallet({
            phone: normalizePhone(phone)
          });

          setState((current) => ({
            ...current,
            ...accountSnapshotToState(result.account)
          }));
          setVerificationState("sent");
        } catch (error) {
          setVerificationState("idle");
          setAccountError(
            error instanceof Error ? error.message : "Could not verify the M-Pesa wallet."
          );
        }
      },
      submitOrder: async (input) => {
        const result = await submitOrderRequest(input, generateIdempotencyKey());

        setState((current) => ({
          ...current,
          walletBalanceKes: Number(result.payload.available_balance),
          reservedBalanceKes: Number(result.payload.reserved_balance)
        }));

        return {
          orderId: result.payload.order_id,
          idempotencyStatus: result.idempotencyStatus
        };
      },
      dismissWhatsAppPrompt: () => {
        setState((current) => ({
          ...current,
          hasSeenWhatsAppPrompt: true
        }));
        setShowWhatsAppPrompt(false);
      },
      joinWhatsAppAlerts: () => {
        setState((current) => ({
          ...current,
          hasSeenWhatsAppPrompt: true,
          joinedWhatsApp: true
        }));
        setShowWhatsAppPrompt(false);
      }
    }),
    [
      accountError,
      accountSheetView,
      isHydrated,
      isSyncingAccount,
      pathname,
      showWhatsAppPrompt,
      state,
      verificationState
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <WhatsAppPrompt />
      <AccountSheet />
    </OnboardingContext.Provider>
  );
}

function accountSnapshotToStateCleared() {
  return {
    isSignedIn: false,
    name: "",
    phone: "",
    mpesaVerified: false,
    walletBalanceKes: 0,
    reservedBalanceKes: 0
  };
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding must be used within OnboardingProvider.");
  }
  return value;
}

function WhatsAppPrompt() {
  const {
    showWhatsAppPrompt,
    dismissWhatsAppPrompt,
    joinWhatsAppAlerts,
    whatsappUrl
  } = useOnboarding();

  if (!showWhatsAppPrompt) {
    return null;
  }

  return (
    <div className="overlay-shell" role="presentation">
      <div className="overlay-backdrop" onClick={dismissWhatsAppPrompt} />
      <section className="dialog-card dialog-card--compact" role="dialog" aria-modal="true">
        <div className="dialog-windowbar">
          <div className="dialog-windowbar__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>Market alerts</span>
        </div>
        <div className="dialog-pill">Fresh market alerts</div>
        <h2>Follow SokoOdds on WhatsApp before this market moves.</h2>
        <p>
          Get pause notices, fast settlement updates, and new Kenya-first market drops without
          digging through the app.
        </p>

        <div className="dialog-feature">
          <div className="dialog-feature__badge">WA</div>
          <div>
            <strong>WhatsApp alert lane</strong>
            <p>Best for closing-soon markets, disputed outcomes, and M-Pesa downtime notices.</p>
          </div>
        </div>

        <div className="dialog-actions">
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="primary-button primary-button--block"
            onClick={joinWhatsAppAlerts}
          >
            Join WhatsApp alerts
          </Link>
          <button
            type="button"
            className="ghost-button primary-button--block"
            onClick={dismissWhatsAppPrompt}
          >
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}

function AccountSheet() {
  const {
    accountSheetView,
    closeAccountSheet,
    state,
    submitAccountProfile,
    requestVerification,
    verificationState,
    accountError
  } = useOnboarding();
  const [name, setName] = useState(state.name);
  const [phone, setPhone] = useState(state.phone || "07");

  useEffect(() => {
    if (accountSheetView === "closed") {
      setName(state.name);
      setPhone(state.phone || "07");
    }
  }, [accountSheetView, state.name, state.phone]);

  if (accountSheetView === "closed") {
    return null;
  }

  const canSubmitAccount = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10;
  const isAccountSubmitting = verificationState === "submitting-account";
  const isVerificationSending = verificationState === "sending";
  const isVerificationComplete = verificationState === "sent" || state.mpesaVerified;

  return (
    <div className="overlay-shell" role="presentation">
      <div className="overlay-backdrop" onClick={closeAccountSheet} />
      <section className="dialog-card dialog-card--wallet" role="dialog" aria-modal="true">
        <div className="dialog-windowbar">
          <div className="dialog-windowbar__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>{accountSheetView === "account" ? "Wallet setup" : "M-Pesa verification"}</span>
        </div>
        {accountSheetView === "account" ? (
          <>
            <div className="dialog-pill">Start in under 30 seconds</div>
            <h2>Create your SokoOdds trading profile.</h2>
            <p>
              Keep the first step light: name, M-Pesa number, then a small verification payment so
              payouts land on the right phone.
            </p>

            <div className="dialog-form">
              <label>
                First name
                <input
                  className="dialog-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Brian"
                />
              </label>
              <label>
                M-Pesa number
                <input
                  className="dialog-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0712 345 678"
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="dialog-inline-note">
              Your first KES 5 verification payment is credited back to your wallet after the phone
              check succeeds.
            </div>

            {accountError ? (
              <div className="dialog-error" role="alert">
                <strong>We could not finish that step.</strong>
                <p>{accountError}</p>
              </div>
            ) : null}

            <div className="dialog-actions">
              <button
                type="button"
                className="primary-button primary-button--block"
                onClick={() => void submitAccountProfile({ name, phone })}
                disabled={!canSubmitAccount || isAccountSubmitting}
              >
                {isAccountSubmitting ? "Creating account..." : "Continue to wallet setup"}
              </button>
              <button
                type="button"
                className="ghost-button primary-button--block"
                onClick={closeAccountSheet}
                disabled={isAccountSubmitting}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="dialog-pill dialog-pill--mpesa">Takes about 10 seconds</div>
            <h2>Verify your M-Pesa for instant withdrawals.</h2>
            <p>
              Link one number once, send a KES 5 verification prompt, and keep payouts tied to the
              same phone with less support friction later.
            </p>

            <div className="dialog-feature dialog-feature--soft">
              <div className="dialog-feature__badge dialog-feature__badge--mpesa">M</div>
              <div>
                <strong>Instant withdrawal setup</strong>
                <p>The KES 5 verification amount is returned to your wallet after the check.</p>
              </div>
            </div>

            <div className="dialog-inline-note">
              Use the number that should receive your payouts. You can update it later from wallet
              settings after re-verification.
            </div>

            {accountError ? (
              <div className="dialog-error" role="alert">
                <strong>Wallet verification needs attention.</strong>
                <p>{accountError}</p>
              </div>
            ) : isVerificationComplete ? (
              <div className="dialog-success" data-testid="wallet-verification-success">
                <strong>Your wallet is ready.</strong>
                <p>
                  KES 5 verification completed for {state.phone}. That amount is now available in
                  your wallet.
                </p>
              </div>
            ) : (
              <div className="dialog-status">
                <strong>KES 5 verification payment</strong>
                <p>We send this as the first trust-building step for new trading accounts.</p>
              </div>
            )}

            <label>
              Your M-Pesa number
              <input
                className="dialog-input dialog-input--large"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0796 851 024"
                inputMode="numeric"
                disabled={isVerificationSending}
              />
            </label>

            <div className="dialog-actions">
              <button
                type="button"
                className="primary-button primary-button--block primary-button--mpesa"
                onClick={() => void requestVerification(phone)}
                disabled={phone.replace(/\D/g, "").length < 10 || isVerificationSending}
              >
                {isVerificationSending ? "Processing verification..." : "Send KES 5 verification"}
              </button>
              <button
                type="button"
                className="ghost-button primary-button--block"
                onClick={closeAccountSheet}
                disabled={isVerificationSending}
              >
                {isVerificationComplete ? "Back to market" : "Skip for now"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
