"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";
import {
  createAccountSession,
  fetchFeedInteractions,
  fetchWalletDepositStatus,
  fetchWalletTransactions,
  fetchWalletWithdrawalStatus,
  fetchCurrentAccount,
  submitKycProfile,
  submitOrder as submitOrderRequest,
  recordFeedInteraction as recordFeedInteractionRequest,
  syncFeedInteractions as syncFeedInteractionsRequest,
  topUpWallet,
  withdrawFromWallet,
  type AccountSnapshot,
  type KycProfileResponse,
  type OrderSubmissionPayload,
  type WalletTransactionItem,
  verifyMpesaWallet
} from "@/lib/account-client";
import { SokoOddsBadge } from "@/components/layout/sokoodds-logo";

const STORAGE_KEY = "sokoodds.onboarding";
const WHATSAPP_SESSION_KEY = "sokoodds.whatsappPromptShownSession";
const WHATSAPP_ALERTS_URL =
  "https://wa.me/254700505050?text=Hi%20SokoOdds%2C%20send%20me%20market%20alerts%20on%20WhatsApp.";

type OnboardingState = {
  hasSeenWhatsAppPrompt: boolean;
  joinedWhatsApp: boolean;
  isSignedIn: boolean;
  name: string;
  phone: string;
  mpesaVerified: boolean;
  kycStatus: string;
  walletBalanceKes: number;
  reservedBalanceKes: number;
};

export type NotificationPreferences = {
  dailyPulse: boolean;
  priceMoves: boolean;
  resolutionSoon: boolean;
  newDrops: boolean;
};

export type FeedInteraction = {
  viewedCount: number;
  pausedCount: number;
  openedCount: number;
  lastInteractedAt: string | null;
};

type AccountSheetView = "closed" | "account" | "verify";
type VerificationState = "idle" | "submitting-account" | "sending" | "sent";
type DepositState = "idle" | "sending" | "sent";
type WithdrawalState = "idle" | "sending" | "sent" | "review";
type KycState = "idle" | "sending" | "pending" | "approved" | "rejected";

type OnboardingContextValue = {
  state: OnboardingState;
  watchlist: string[];
  recentMarketSlugs: string[];
  notificationPreferences: NotificationPreferences;
  feedInteractions: Record<string, FeedInteraction>;
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
  submitKyc: (input: {
    legalName: string;
    nationalIdNumber: string;
    dateOfBirth: string;
    documentReference: string;
  }) => Promise<void>;
  toggleWatchlist: (marketSlug: string) => void;
  recordMarketVisit: (marketSlug: string) => void;
  recordFeedImpression: (marketSlug: string) => void;
  recordFeedPause: (marketSlug: string) => void;
  recordFeedOpen: (marketSlug: string) => void;
  updateNotificationPreference: (
    key: keyof NotificationPreferences,
    value: boolean
  ) => void;
  dismissWhatsAppPrompt: () => void;
  joinWhatsAppAlerts: () => void;
  showWhatsAppPrompt: boolean;
  verificationState: VerificationState;
  depositState: DepositState;
  withdrawalState: WithdrawalState;
  kycState: KycState;
  kycProfile: KycProfileResponse | null;
  walletActivity: WalletTransactionItem[];
  isWalletActivityLoading: boolean;
  whatsappUrl: string;
};

const DEFAULT_STATE: OnboardingState = {
  hasSeenWhatsAppPrompt: false,
  joinedWhatsApp: false,
  isSignedIn: false,
  name: "",
  phone: "",
  mpesaVerified: false,
  kycStatus: "not_started",
  walletBalanceKes: 0,
  reservedBalanceKes: 0
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyPulse: true,
  priceMoves: true,
  resolutionSoon: true,
  newDrops: false
};

const DEFAULT_FEED_INTERACTION: FeedInteraction = {
  viewedCount: 0,
  pausedCount: 0,
  openedCount: 0,
  lastInteractedAt: null
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

function loadStoredWatchlist(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem("sokoodds.watchlist");
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function loadStoredRecentMarkets(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem("sokoodds.recent-markets");
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function loadStoredNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const raw = window.localStorage.getItem("sokoodds.notification-preferences");
  if (!raw) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      dailyPulse: parsed.dailyPulse ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyPulse,
      priceMoves: parsed.priceMoves ?? DEFAULT_NOTIFICATION_PREFERENCES.priceMoves,
      resolutionSoon: parsed.resolutionSoon ?? DEFAULT_NOTIFICATION_PREFERENCES.resolutionSoon,
      newDrops: parsed.newDrops ?? DEFAULT_NOTIFICATION_PREFERENCES.newDrops
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

function loadStoredFeedInteractions(): Record<string, FeedInteraction> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem("sokoodds.feed-interactions");
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<FeedInteraction>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([slug, value]) => [
        slug,
        {
          viewedCount: typeof value.viewedCount === "number" ? value.viewedCount : 0,
          pausedCount: typeof value.pausedCount === "number" ? value.pausedCount : 0,
          openedCount: typeof value.openedCount === "number" ? value.openedCount : 0,
          lastInteractedAt:
            typeof value.lastInteractedAt === "string" ? value.lastInteractedAt : null
        }
      ])
    );
  } catch {
    return {};
  }
}

function nextFeedInteraction(
  current: Record<string, FeedInteraction>,
  marketSlug: string,
  key: "viewedCount" | "pausedCount" | "openedCount"
) {
  const existing = current[marketSlug] ?? DEFAULT_FEED_INTERACTION;
  return {
    ...current,
    [marketSlug]: {
      ...existing,
      [key]: existing[key] + 1,
      lastInteractedAt: new Date().toISOString()
    }
  };
}

function mergeFeedInteractions(
  current: Record<string, FeedInteraction>,
  incoming: Record<string, FeedInteraction>
) {
  const merged = { ...current };

  for (const [slug, value] of Object.entries(incoming)) {
    const existing = merged[slug];
    merged[slug] = {
      viewedCount: Math.max(existing?.viewedCount ?? 0, value.viewedCount),
      pausedCount: Math.max(existing?.pausedCount ?? 0, value.pausedCount),
      openedCount: Math.max(existing?.openedCount ?? 0, value.openedCount),
      lastInteractedAt:
        existing?.lastInteractedAt && value.lastInteractedAt
          ? existing.lastInteractedAt > value.lastInteractedAt
            ? existing.lastInteractedAt
            : value.lastInteractedAt
          : existing?.lastInteractedAt ?? value.lastInteractedAt ?? null
    };
  }

  return merged;
}

function hasShownWhatsAppPromptThisSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(WHATSAPP_SESSION_KEY) === "1";
}

function markWhatsAppPromptShownThisSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(WHATSAPP_SESSION_KEY, "1");
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
    kycStatus: snapshot.user.kycStatus,
    walletBalanceKes: Number(snapshot.wallet.availableBalanceKes),
    reservedBalanceKes: Number(snapshot.wallet.reservedBalanceKes)
  };
}

function resolveKycState(status: string): KycState {
  if (status === "approved") {
    return "approved";
  }
  if (status === "pending") {
    return "pending";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "idle";
}

function generateIdempotencyKey() {
  if (typeof window !== "undefined" && "crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `sokoodds-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [state, setState] = useState<OnboardingState>(() => ({
    ...DEFAULT_STATE,
    ...loadStoredState()
  }));
  const [watchlist, setWatchlist] = useState<string[]>(() => loadStoredWatchlist());
  const [recentMarketSlugs, setRecentMarketSlugs] = useState<string[]>(() => loadStoredRecentMarkets());
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    () => loadStoredNotificationPreferences()
  );
  const [feedInteractions, setFeedInteractions] = useState<Record<string, FeedInteraction>>(
    () => loadStoredFeedInteractions()
  );
  const [isSyncingAccount, setIsSyncingAccount] = useState(true);
  const [accountSheetView, setAccountSheetView] = useState<AccountSheetView>("closed");
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [depositState, setDepositState] = useState<DepositState>("idle");
  const [withdrawalState, setWithdrawalState] = useState<WithdrawalState>("idle");
  const [kycState, setKycState] = useState<KycState>("idle");
  const [kycProfile, setKycProfile] = useState<KycProfileResponse | null>(null);
  const [walletActivity, setWalletActivity] = useState<WalletTransactionItem[]>([]);
  const [isWalletActivityLoading, setIsWalletActivityLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const hasSyncedFeedInteractionsRef = useRef(false);

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

    window.localStorage.setItem("sokoodds.watchlist", JSON.stringify(watchlist));
  }, [isHydrated, watchlist]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem("sokoodds.recent-markets", JSON.stringify(recentMarketSlugs));
  }, [isHydrated, recentMarketSlugs]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      "sokoodds.notification-preferences",
      JSON.stringify(notificationPreferences)
    );
  }, [isHydrated, notificationPreferences]);

  useEffect(() => {
    if (!isHydrated || !state.isSignedIn) {
      hasSyncedFeedInteractionsRef.current = false;
      return;
    }

    if (hasSyncedFeedInteractionsRef.current) {
      return;
    }

    hasSyncedFeedInteractionsRef.current = true;
    let isCancelled = false;

    async function syncFeedInteractions() {
      try {
        const localItems = Object.entries(feedInteractions).map(([marketSlug, interaction]) => ({
          marketSlug,
          viewedCount: interaction.viewedCount,
          pausedCount: interaction.pausedCount,
          openedCount: interaction.openedCount,
          lastInteractedAt: interaction.lastInteractedAt
        }));

        const payload =
          localItems.length > 0
            ? await syncFeedInteractionsRequest({ items: localItems })
            : await fetchFeedInteractions();
        if (isCancelled) {
          return;
        }

        const incoming = Object.fromEntries(
          payload.items.map((item) => [
            item.marketSlug,
            {
              viewedCount: item.viewedCount,
              pausedCount: item.pausedCount,
              openedCount: item.openedCount,
              lastInteractedAt: item.lastInteractedAt
            }
          ])
        );
        setFeedInteractions((current) => mergeFeedInteractions(current, incoming));
      } catch {
        return;
      }
    }

    void syncFeedInteractions();

    return () => {
      isCancelled = true;
    };
  }, [feedInteractions, isHydrated, state.isSignedIn]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem("sokoodds.feed-interactions", JSON.stringify(feedInteractions));
  }, [feedInteractions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let isCancelled = false;

    async function syncCurrentAccount() {
      try {
        const account = await fetchCurrentAccount();
        if (isCancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          ...(account ? accountSnapshotToState(account) : accountSnapshotToStateCleared())
        }));
      } catch {
        if (isCancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          ...accountSnapshotToStateCleared()
        }));
      } finally {
        if (!isCancelled) {
          setIsSyncingAccount(false);
        }
      }
    }

    void syncCurrentAccount();

    return () => {
      isCancelled = true;
    };
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (
      !pathname.startsWith("/markets/") ||
      state.hasSeenWhatsAppPrompt ||
      accountSheetView !== "closed" ||
      hasShownWhatsAppPromptThisSession()
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      markWhatsAppPromptShownThisSession();
      setShowWhatsAppPrompt(true);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [accountSheetView, isHydrated, pathname, state.hasSeenWhatsAppPrompt]);

  const refreshWalletActivity = useCallback(async () => {
    if (!state.isSignedIn) {
      setWalletActivity([]);
      setIsWalletActivityLoading(false);
      return;
    }

    setIsWalletActivityLoading(true);

    try {
      const payload = await fetchWalletTransactions();
      setWalletActivity(payload.items);
      setState((current) => ({
        ...current,
        ...accountSnapshotToState(payload.account)
      }));
    } catch {
      setWalletActivity([]);
    } finally {
      setIsWalletActivityLoading(false);
    }
  }, [state.isSignedIn]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      watchlist,
      recentMarketSlugs,
      notificationPreferences,
      feedInteractions,
      isHydrated,
      isSyncingAccount,
      accountSheetView,
      showWhatsAppPrompt,
      verificationState,
      depositState,
      withdrawalState,
      kycState,
      kycProfile,
      walletActivity,
      isWalletActivityLoading,
      whatsappUrl: WHATSAPP_ALERTS_URL,
      accountError,
      openAccountSheet: () => {
        setAccountError(null);
        setVerificationState("idle");
        setDepositState("idle");
        setWithdrawalState("idle");
        setKycState(resolveKycState(state.kycStatus));
        if (state.isSignedIn) {
          void refreshWalletActivity();
        }
        setAccountSheetView(state.isSignedIn ? "verify" : "account");
      },
      openVerificationSheet: () => {
        setAccountError(null);
        setVerificationState(state.mpesaVerified ? "sent" : "idle");
        setDepositState("idle");
        setWithdrawalState("idle");
        setKycState(resolveKycState(state.kycStatus));
        void refreshWalletActivity();
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
        setKycState(resolveKycState(state.kycStatus));
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
          setWalletActivity([]);
          setKycProfile(null);
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
          await refreshWalletActivity();
          setVerificationState("sent");
          setDepositState("idle");
          setWithdrawalState("idle");
          setKycState(resolveKycState(result.account.user.kycStatus));
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
          await refreshWalletActivity();
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
          await refreshWalletActivity();
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
      submitKyc: async (input) => {
        setAccountError(null);
        setKycState("sending");

        try {
          const result = await submitKycProfile(input);
          setState((current) => ({
            ...current,
            ...accountSnapshotToState(result.account)
          }));
          setKycProfile(result.profile);
          setKycState(resolveKycState(result.status));
        } catch (error) {
          setKycState(resolveKycState(state.kycStatus));
          setAccountError(error instanceof Error ? error.message : "Could not submit KYC.");
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
      toggleWatchlist: (marketSlug) => {
        setWatchlist((current) =>
          current.includes(marketSlug)
            ? current.filter((slug) => slug !== marketSlug)
            : [marketSlug, ...current].slice(0, 24)
        );
      },
      recordMarketVisit: (marketSlug) => {
        setRecentMarketSlugs((current) => [marketSlug, ...current.filter((slug) => slug !== marketSlug)].slice(0, 12));
      },
      recordFeedImpression: (marketSlug) => {
        setFeedInteractions((current) => nextFeedInteraction(current, marketSlug, "viewedCount"));
        if (state.isSignedIn) {
          void recordFeedInteractionRequest({ marketSlug, eventType: "view" }).catch(() => undefined);
        }
      },
      recordFeedPause: (marketSlug) => {
        setFeedInteractions((current) => nextFeedInteraction(current, marketSlug, "pausedCount"));
        if (state.isSignedIn) {
          void recordFeedInteractionRequest({ marketSlug, eventType: "pause" }).catch(() => undefined);
        }
      },
      recordFeedOpen: (marketSlug) => {
        setFeedInteractions((current) => nextFeedInteraction(current, marketSlug, "openedCount"));
        if (state.isSignedIn) {
          void recordFeedInteractionRequest({ marketSlug, eventType: "open" }).catch(() => undefined);
        }
      },
      updateNotificationPreference: (key, value) => {
        setNotificationPreferences((current) => ({
          ...current,
          [key]: value
        }));
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
      refreshWalletActivity,
      showWhatsAppPrompt,
      state,
      watchlist,
      recentMarketSlugs,
      notificationPreferences,
      feedInteractions,
      verificationState,
      depositState,
      withdrawalState,
      kycState,
      kycProfile,
      walletActivity,
      isWalletActivityLoading
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <WhatsAppPrompt />
      {accountSheetView === "closed" ? null : (
        <AccountSheet key={`${accountSheetView}-${state.name}-${state.phone}-${state.kycStatus}`} />
      )}
    </OnboardingContext.Provider>
  );
}

function accountSnapshotToStateCleared() {
  return {
    isSignedIn: false,
    name: "",
    phone: "",
    mpesaVerified: false,
    kycStatus: "not_started",
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
        <div className="dialog-brand">
          <SokoOddsBadge className="dialog-brand__badge" alt="SokoOdds WhatsApp alerts" />
          <span>SokoOdds alerts</span>
        </div>
        <div className="dialog-pill">Market alerts</div>
        <h2>Get SokoOdds market alerts on WhatsApp.</h2>
        <p>
          Get pause notices, settlement updates, and new Kenya-first market drops without digging
          through the app.
        </p>

        <div className="dialog-feature">
          <div className="dialog-feature__badge">WA</div>
          <div>
            <strong>WhatsApp alerts</strong>
            <p>Best for closing markets, disputed outcomes, and M-Pesa downtime notices.</p>
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
    submitKyc,
    submitAccountProfile,
    requestWalletTopUp,
    requestWalletWithdrawal,
    requestVerification,
    verificationState,
    depositState,
    withdrawalState,
    kycState,
    kycProfile,
    walletActivity,
    isWalletActivityLoading,
    accountError
  } = useOnboarding();
  const [name, setName] = useState(state.name);
  const [phone, setPhone] = useState(state.phone || "07");
  const [legalName, setLegalName] = useState(state.name ? `${state.name} ` : "");
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [documentReference, setDocumentReference] = useState("");

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
  const isKycSending = kycState === "sending";
  const canSubmitKyc =
    legalName.trim().length >= 4 &&
    nationalIdNumber.trim().length >= 6 &&
    dateOfBirth.length === 10 &&
    documentReference.trim().length >= 4;

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
        <div className="dialog-brand">
          <SokoOddsBadge className="dialog-brand__badge" alt="SokoOdds wallet setup" />
          <span>SokoOdds wallet</span>
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
              Your first KES 5 verification payment is credited back after the phone check succeeds.
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
              same phone.
            </p>

            <div className="dialog-feature dialog-feature--soft">
              <div className="dialog-feature__badge dialog-feature__badge--mpesa">M</div>
              <div>
                <strong>Instant withdrawal setup</strong>
                <p>The KES 5 verification amount is returned after the check.</p>
              </div>
            </div>

            <div className="dialog-inline-note">
              Use the number that should receive payouts. You can update it later after re-verification.
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
                <p>This is the first trust check for new trading accounts.</p>
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

                <div className="dialog-status">
                  <strong>KYC review</strong>
                  <p>
                    Submit your legal details once so larger limits and stricter trading gates can
                    rely on a reviewed profile.
                  </p>
                </div>
                {kycState === "approved" ? (
                  <div className="dialog-success" data-testid="kyc-approved-success">
                    <strong>KYC approved.</strong>
                    <p>Your profile is now cleared for stricter wallet and trading controls.</p>
                  </div>
                ) : kycState === "pending" ? (
                  <div className="dialog-status" data-testid="kyc-pending-status">
                    <strong>KYC submitted.</strong>
                    <p>
                      {kycProfile?.legalName ?? "Your profile"} is waiting for review. We will keep
                      the current wallet flow available while review is pending.
                    </p>
                  </div>
                ) : kycState === "rejected" ? (
                  <div className="dialog-error" role="alert" data-testid="kyc-rejected-status">
                    <strong>KYC needs an update.</strong>
                    <p>{kycProfile?.rejectionReason ?? "Please correct the submission and try again."}</p>
                  </div>
                ) : null}
                {state.kycStatus !== "approved" ? (
                  <div className="dialog-form dialog-form--kyc">
                    <label>
                      Legal name
                      <input
                        className="dialog-input"
                        value={legalName}
                        onChange={(event) => setLegalName(event.target.value)}
                        placeholder="Bryan Bosire"
                      />
                    </label>
                    <label>
                      National ID number
                      <input
                        className="dialog-input"
                        value={nationalIdNumber}
                        onChange={(event) => setNationalIdNumber(event.target.value)}
                        placeholder="12345678"
                        inputMode="numeric"
                      />
                    </label>
                    <label>
                      Date of birth
                      <input
                        className="dialog-input"
                        type="date"
                        value={dateOfBirth}
                        onChange={(event) => setDateOfBirth(event.target.value)}
                      />
                    </label>
                    <label>
                      Document link or reference
                      <input
                        className="dialog-input"
                        value={documentReference}
                        onChange={(event) => setDocumentReference(event.target.value)}
                        placeholder="https://example.com/id.pdf"
                      />
                    </label>
                    <button
                      type="button"
                      className="ghost-button primary-button--block"
                      onClick={() =>
                        void submitKyc({
                          legalName,
                          nationalIdNumber,
                          dateOfBirth,
                          documentReference
                        })
                      }
                      disabled={isKycSending || !canSubmitKyc}
                    >
                      {isKycSending ? "Submitting KYC..." : "Submit KYC for review"}
                    </button>
                  </div>
                ) : null}

                <div className="wallet-activity" data-testid="wallet-activity">
                  <div className="wallet-activity__header">
                    <strong>Wallet activity</strong>
                    <span>Latest funding and payout movement</span>
                  </div>
                  {isWalletActivityLoading ? (
                    <div className="wallet-activity__empty">Refreshing wallet activity...</div>
                  ) : walletActivity.length > 0 ? (
                    <div className="wallet-activity__list">
                      {walletActivity.map((item) => (
                        <article className="wallet-activity__item" key={item.id}>
                          <div className="wallet-activity__copy">
                            <div className="wallet-activity__topline">
                              <strong>{item.title}</strong>
                              <span
                                className={`wallet-activity__badge wallet-activity__badge--${item.status}`}
                              >
                                {formatActivityStatus(item.status)}
                              </span>
                            </div>
                            <p>{item.subtitle}</p>
                          </div>
                          <div className="wallet-activity__meta">
                            <strong>{formatActivityAmount(item)}</strong>
                            <span>{formatActivityDate(item.createdAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="wallet-activity__empty">
                      Your latest top-ups, verification credits, and withdrawals will appear here.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function formatActivityStatus(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "review_required":
      return "In review";
    case "failed":
      return "Released";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatActivityAmount(item: WalletTransactionItem) {
  const sign = item.kind === "withdrawal" && item.status !== "failed" ? "-" : "+";
  return `${sign} Ksh ${Number(item.amountKes).toLocaleString("en-KE")}`;
}

function formatActivityDate(createdAt: string) {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Just now";
  }

  return parsedDate.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
