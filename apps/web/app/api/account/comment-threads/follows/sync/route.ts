import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before syncing thread follows." }, { status: 401 });
  }

  const rawBody = await request.text();
  let body: { items?: unknown[] } = { items: [] };

  if (rawBody.trim().length > 0) {
    try {
      body = JSON.parse(rawBody) as { items?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: "Could not sync thread follows." },
        { status: 400 },
      );
    }
  }

  const apiResponse = await fetch(buildApiServerUrl("/comment-threads/follows/sync"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not sync thread follows.") },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: apiResponse.status });
}
