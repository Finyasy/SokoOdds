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
  creditedAmountKes: string;
  account: AccountSnapshot;
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
