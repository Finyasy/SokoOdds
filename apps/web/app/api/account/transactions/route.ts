import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before viewing wallet activity." }, { status: 401 });
  }

  const apiResponse = await fetch(buildApiServerUrl("/wallet/transactions"), {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      {
        error: getApiErrorMessage(payload, "Could not read wallet activity."),
      },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
