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
  fetchWalletDepositStatus,
  fetchWalletWithdrawalStatus,
  fetchCurrentAccount,
  submitOrder as submitOrderRequest,
  topUpWallet,
  withdrawFromWallet,
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
type DepositState = "idle" | "sending" | "sent";
type WithdrawalState = "idle" | "sending" | "sent" | "review";

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
  requestWalletTopUp: (amountKes: number) => Promise<{ creditedAmountKes: string }>;
  requestWalletWithdrawal: (
    amountKes: number
  ) => Promise<{ releasedAmountKes: string; status: "completed" | "pending" | "review_required" }>;
  dismissWhatsAppPrompt: () => void;
  joinWhatsAppAlerts: () => void;
  showWhatsAppPrompt: boolean;
  verificationState: VerificationState;
  depositState: DepositState;
  withdrawalState: WithdrawalState;
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
  const [depositState, setDepositState] = useState<DepositState>("idle");
  const [withdrawalState, setWithdrawalState] = useState<WithdrawalState>("idle");
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
      depositState,
      withdrawalState,
      whatsappUrl: WHATSAPP_ALERTS_URL,
      accountError,
      openAccountSheet: () => {
        setAccountError(null);
        setVerificationState("idle");
        setDepositState("idle");
        setWithdrawalState("idle");
        setAccountSheetView(state.isSignedIn ? "verify" : "account");
      },
      openVerificationSheet: () => {
        setAccountError(null);
        setVerificationState(state.mpesaVerified ? "sent" : "idle");
        setDepositState("idle");
        setWithdrawalState("idle");
        setAccountSheetView("verify");
      },
      closeAccountSheet: () => {
        if (
          verificationState === "sending" ||
          verificationState === "submitting-account" ||
          depositState === "sending" ||
          withdrawalState === "sending"
        ) {
          return;
        }
        setAccountError(null);
        setAccountSheetView("closed");
        setVerificationState(state.mpesaVerified ? "sent" : "idle");
        setDepositState("idle");
        setWithdrawalState("idle");
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
          setDepositState("idle");
          setWithdrawalState("idle");
        } catch (error) {
          setVerificationState("idle");
          setAccountError(
            error instanceof Error ? error.message : "Could not verify the M-Pesa wallet."
          );
        }
      },
      requestWalletTopUp: async (amountKes) => {
        setAccountError(null);
        setDepositState("sending");

        try {
          const initiated = await topUpWallet({
            amountKes: amountKes.toFixed(2)
          });
          let latestStatus = initiated.status;
          let latestAccount = initiated.account;
          let creditedAmountKes = "0.00";

          for (let attempt = 0; attempt < 6 && latestStatus === "pending"; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 350));
            const status = await fetchWalletDepositStatus(initiated.depositReference);
            latestStatus = status.status;
            latestAccount = status.account;
            creditedAmountKes = status.creditedAmountKes;
          }

          setState((current) => ({
            ...current,
            ...accountSnapshotToState(latestAccount)
          }));
          setDepositState(latestStatus === "completed" ? "sent" : "idle");

          return {
            creditedAmountKes
          };
        } catch (error) {
          setDepositState("idle");
          setAccountError(
            error instanceof Error ? error.message : "Could not initiate the M-Pesa top-up."
          );
          throw error;
        }
      },
      requestWalletWithdrawal: async (amountKes) => {
        setAccountError(null);
        setWithdrawalState("sending");

        try {
          const initiated = await withdrawFromWallet({
            amountKes: amountKes.toFixed(2)
          });
          let latestStatus = initiated.status;
          let latestAccount = initiated.account;
          let releasedAmountKes = "0.00";

          for (let attempt = 0; attempt < 6 && latestStatus === "pending"; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 350));
            const status = await fetchWalletWithdrawalStatus(initiated.withdrawalReference);
            latestStatus = status.status;
            latestAccount = status.account;
            releasedAmountKes = status.releasedAmountKes;
          }

          setState((current) => ({
            ...current,
            ...accountSnapshotToState(latestAccount)
          }));
          setWithdrawalState(
            latestStatus === "review_required"
              ? "review"
              : latestStatus === "completed"
                ? "sent"
                : "idle"
          );

          return {
            releasedAmountKes,
            status:
              latestStatus === "review_required" || latestStatus === "pending"
                ? latestStatus
                : "completed"
          };
        } catch (error) {
          setWithdrawalState("idle");
          setAccountError(
            error instanceof Error ? error.message : "Could not initiate the M-Pesa withdrawal."
          );
          throw error;
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
      verificationState,
      depositState,
      withdrawalState
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
    requestWalletTopUp,
    requestWalletWithdrawal,
    requestVerification,
    verificationState,
    depositState,
    withdrawalState,
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
  const isDepositSending = depositState === "sending";
  const isDepositComplete = depositState === "sent";
  const isWithdrawalSending = withdrawalState === "sending";
  const isWithdrawalComplete = withdrawalState === "sent";
  const isWithdrawalReview = withdrawalState === "review";

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

            {isVerificationComplete ? (
              <div className="dialog-topup">
                <div className="dialog-status">
                  <strong>Need a little more balance?</strong>
                  <p>
                    Trigger a fast KES 500 M-Pesa top-up from the same wallet sheet so you can keep
                    trading after the first verification-funded order.
                  </p>
                </div>
                {isDepositComplete ? (
                  <div className="dialog-success" data-testid="wallet-topup-success">
                    <strong>KES 500 top-up initiated.</strong>
                    <p>Your wallet balance has been refreshed and is ready for the next trade.</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="primary-button primary-button--block"
                  onClick={() => void requestWalletTopUp(500)}
                  disabled={isDepositSending}
                >
                  {isDepositSending ? "Sending M-Pesa prompt..." : "Add KES 500 via M-Pesa"}
                </button>

                <div className="dialog-status">
                  <strong>Need to cash out?</strong>
                  <p>
                    Withdraw a small amount back to the same M-Pesa number. Larger requests move
                    into review first so payouts stay safe.
                  </p>
                </div>
                {isWithdrawalComplete ? (
                  <div className="dialog-success" data-testid="wallet-withdrawal-success">
                    <strong>KES 200 withdrawal completed.</strong>
                    <p>Your wallet reserve has been released and the payout path completed.</p>
                  </div>
                ) : null}
                {isWithdrawalReview ? (
                  <div className="dialog-status" data-testid="wallet-withdrawal-review">
                    <strong>Withdrawal queued for review.</strong>
                    <p>We have held the funds and a higher-value payout now needs manual approval.</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="ghost-button primary-button--block"
                  onClick={() => void requestWalletWithdrawal(200)}
                  disabled={isWithdrawalSending || state.walletBalanceKes < 200}
                >
                  {isWithdrawalSending ? "Sending payout request..." : "Withdraw KES 200 to M-Pesa"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
