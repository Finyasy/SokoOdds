import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson,
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before checking withdrawal status." }, { status: 401 });
  }

  const { reference } = await context.params;
  const apiResponse = await fetch(buildApiServerUrl(`/wallet/withdraw/${reference}`), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      {
        error: getApiErrorMessage(payload, "Could not read the withdrawal status."),
      },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
