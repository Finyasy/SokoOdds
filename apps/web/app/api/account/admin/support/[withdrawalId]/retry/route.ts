import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson
} from "@/lib/server-api";

type RouteContext = {
  params: Promise<{
    withdrawalId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: RouteContext) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before retrying payment dispatch." }, { status: 401 });
  }

  const { withdrawalId } = await params;
  const apiResponse = await fetch(buildApiServerUrl(`/admin/wallet/activity/${withdrawalId}/retry`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    cache: "no-store"
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not retry the payment dispatch.") },
      { status: apiResponse.status || 500 }
    );
  }

  return NextResponse.json(payload, { status: apiResponse.status });
}
