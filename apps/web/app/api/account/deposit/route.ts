import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before topping up your wallet." }, { status: 401 });
  }

  const body = await request.json();
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? randomUUID();
  const apiResponse = await fetch(buildApiServerUrl("/wallet/deposit"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      {
        error: getApiErrorMessage(payload, "Could not initiate the M-Pesa top-up.")
      },
      { status: apiResponse.status || 500 }
    );
  }

  return NextResponse.json(payload, {
    status: apiResponse.status,
    headers: {
      "X-Idempotency-Status": apiResponse.headers.get("X-Idempotency-Status") ?? "created"
    }
  });
}
