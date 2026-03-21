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
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before reviewing KYC." }, { status: 401 });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const apiResponse = await fetch(buildApiServerUrl(`/admin/kyc/profiles/${userId}/review`), {
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
      { error: getApiErrorMessage(payload, "Could not review the KYC profile.") },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
