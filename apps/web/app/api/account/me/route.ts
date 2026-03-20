import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, buildApiServerUrl, readApiJson } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  const apiResponse = await fetch(buildApiServerUrl("/me"), {
    headers: {
      Authorization: `Bearer ${sessionToken}`
    },
    cache: "no-store"
  });

  if (apiResponse.status === 401) {
    const useSecureCookies = request.nextUrl.protocol === "https:";
    const response = NextResponse.json({ authenticated: false }, { status: 200 });
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

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok || !payload || typeof payload !== "object") {
    return NextResponse.json(
      { authenticated: false, error: "Could not read the current account." },
      { status: apiResponse.status || 500 }
    );
  }

  const typedPayload = payload as {
    account?: unknown;
  };
  if (typedPayload.account === undefined) {
    return NextResponse.json(
      { authenticated: false, error: "The account response was incomplete." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      account: typedPayload.account
    },
    { status: 200 }
  );
}
