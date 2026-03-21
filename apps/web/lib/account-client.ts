export type AccountSnapshot = {
  user: {
    id: string;
    firstName: string;
    phone: string;
    mpesaPhone: string | null;
    mpesaVerified: boolean;
  };
  wallet: {
    currency: string;
    availableBalanceKes: string;
    reservedBalanceKes: string;
  };
};

export type OrderSubmissionPayload = {
  market_id: string;
  side: "YES" | "NO";
  direction: "BUY" | "SELL";
  price: string;
  quantity: string;
};

export type OrderSubmissionResponse = {
  order_id: string;
  status: string;
  market_id: string;
  reserved_amount: string;
  available_balance: string;
  reserved_balance: string;
};

export type WalletDepositResponse = {
  status: string;
  depositReference: string;
  requestedAmountKes: string;
  checkoutRequestId: string | null;
  customerMessage: string | null;
  account: AccountSnapshot;
};

export type WalletDepositStatusResponse = {
  status: string;
  depositReference: string;
  requestedAmountKes: string;
  creditedAmountKes: string;
  account: AccountSnapshot;
};

export type WalletWithdrawalResponse = {
  status: string;
  withdrawalReference: string;
  requestedAmountKes: string;
  reviewRequired: boolean;
  customerMessage: string | null;
  account: AccountSnapshot;
};

export type WalletWithdrawalStatusResponse = {
  status: string;
  withdrawalReference: string;
  requestedAmountKes: string;
  releasedAmountKes: string;
  reviewRequired: boolean;
  account: AccountSnapshot;
};

export type WalletTransactionItem = {
  id: string;
  kind: string;
  status: string;
  title: string;
  subtitle: string;
  amountKes: string;
  createdAt: string;
};

export type WalletTransactionsResponse = {
  account: AccountSnapshot;
  items: WalletTransactionItem[];
};

type AccountApiErrorShape = {
  detail?: string;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function getErrorMessage(payload: AccountApiErrorShape | null, fallback: string) {
  if (payload?.detail) {
    return payload.detail;
  }
  if (payload?.error) {
    return payload.error;
  }
  return fallback;
}

export async function createAccountSession(input: {
  firstName: string;
  phone: string;
}): Promise<AccountSnapshot> {
  const response = await fetch("/api/account/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await readJson<{ account: AccountSnapshot } & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not create the SokoOdds account."));
  }

  return payload.account;
}

export async function fetchCurrentAccount(): Promise<AccountSnapshot | null> {
  const response = await fetch("/api/account/me", {
    cache: "no-store"
  });

  const payload = await readJson<
    { authenticated: boolean; account?: AccountSnapshot } & AccountApiErrorShape
  >(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Could not read the current account."));
  }

  if (!payload?.authenticated || !payload.account) {
    return null;
  }

  return payload.account;
}

export async function verifyMpesaWallet(input: { phone: string }): Promise<{
  account: AccountSnapshot;
  status: string;
  verificationCreditKes: string;
}> {
  const response = await fetch("/api/account/verify-mpesa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await readJson<
    { account: AccountSnapshot; status: string; verificationCreditKes: string } & AccountApiErrorShape
  >(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not verify the M-Pesa wallet."));
  }

  return payload;
}

export async function topUpWallet(input: { amountKes: string }): Promise<WalletDepositResponse> {
  const response = await fetch("/api/account/deposit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await readJson<WalletDepositResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not initiate the M-Pesa top-up."));
  }

  return payload;
}

export async function fetchWalletDepositStatus(
  depositReference: string
): Promise<WalletDepositStatusResponse> {
  const response = await fetch(`/api/account/deposit/${depositReference}`, {
    cache: "no-store"
  });

  const payload = await readJson<WalletDepositStatusResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not read the deposit status."));
  }

  return payload;
}

export async function withdrawFromWallet(input: {
  amountKes: string;
}): Promise<WalletWithdrawalResponse> {
  const response = await fetch("/api/account/withdraw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const payload = await readJson<WalletWithdrawalResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not initiate the M-Pesa withdrawal."));
  }

  return payload;
}

export async function fetchWalletWithdrawalStatus(
  withdrawalReference: string
): Promise<WalletWithdrawalStatusResponse> {
  const response = await fetch(`/api/account/withdraw/${withdrawalReference}`, {
    cache: "no-store"
  });

  const payload = await readJson<WalletWithdrawalStatusResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account) {
    throw new Error(getErrorMessage(payload, "Could not read the withdrawal status."));
  }

  return payload;
}

export async function fetchWalletTransactions(): Promise<WalletTransactionsResponse> {
  const response = await fetch("/api/account/transactions", {
    cache: "no-store"
  });

  const payload = await readJson<WalletTransactionsResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.account || !Array.isArray(payload.items)) {
    throw new Error(getErrorMessage(payload, "Could not read wallet activity."));
  }

  return payload;
}

export async function submitOrder(
  input: OrderSubmissionPayload,
  idempotencyKey: string
): Promise<{
  payload: OrderSubmissionResponse;
  idempotencyStatus: string | null;
}> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(input)
  });

  const payload = await readJson<OrderSubmissionResponse & AccountApiErrorShape>(response);
  if (!response.ok || !payload?.order_id) {
    throw new Error(getErrorMessage(payload, "Could not submit the order."));
  }

  return {
    payload,
    idempotencyStatus: response.headers.get("X-Idempotency-Status")
  };
}
