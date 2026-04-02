import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildApiServerUrl,
  getApiErrorMessage,
  readApiJson
} from "@/lib/server-api";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown>;
  let redirectTo: string | null = null;

  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = {
      firstName: String(formData.get("firstName") ?? ""),
      phone: String(formData.get("phone") ?? "")
    };
    const candidateRedirect = String(formData.get("redirectTo") ?? "");
    redirectTo = candidateRedirect.startsWith("/") ? candidateRedirect : null;
  }
  const useSecureCookies = request.nextUrl.protocol === "https:";

  const apiResponse = await fetch(buildApiServerUrl("/auth/onboard"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok || !payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        error: getApiErrorMessage(payload, "Could not create the SokoOdds account.")
      },
      { status: apiResponse.status || 500 }
    );
  }

  const typedPayload = payload as {
    sessionToken?: string;
    account?: unknown;
  };
  if (typeof typedPayload.sessionToken !== "string" || typedPayload.account === undefined) {
    return NextResponse.json(
      {
        error: "The account setup response was incomplete."
      },
      { status: 502 }
    );
  }

  const redirectBase =
    request.headers.get("origin") ??
    `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;

  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, redirectBase), { status: 303 })
    : NextResponse.json(
        {
          account: typedPayload.account
        },
        { status: 200 }
      );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: typedPayload.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const useSecureCookies = request.nextUrl.protocol === "https:";

  if (sessionToken) {
    await fetch(buildApiServerUrl("/auth/session"), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sessionToken}`
      },
      cache: "no-store"
    });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies,
    path: "/",
    maxAge: 0
  });
  return response;
}
