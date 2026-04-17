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

type RouteContext = {
  params: Promise<{
    withdrawalId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before reviewing withdrawals." }, { status: 401 });
  }

  const { withdrawalId } = await params;
  const requestBody = await request.text();
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? randomUUID();
  const apiResponse = await fetch(buildApiServerUrl(`/admin/wallet/activity/${withdrawalId}/review`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: requestBody
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not review the withdrawal.") },
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
