import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before viewing admin support activity." }, { status: 401 });
  }

  const apiUrl = new URL(buildApiServerUrl("/admin/wallet/activity"));
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    apiUrl.searchParams.set(key, value);
  }

  const apiResponse = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    cache: "no-store"
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not load admin wallet support activity.") },
      { status: apiResponse.status || 500 }
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
