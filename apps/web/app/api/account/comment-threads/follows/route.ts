import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Sign in before reading thread follows." }, { status: 401 });
  }

  const apiResponse = await fetch(buildApiServerUrl("/comment-threads/follows"), {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  const payload = await readApiJson(apiResponse);
  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not load thread follows.") },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: 200 });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before saving thread follows." }, { status: 401 });
  }

  const body = await request.json();

  const apiResponse = await fetch(buildApiServerUrl("/comment-threads/follows"), {
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
      { error: getApiErrorMessage(payload, "Could not save the thread follow.") },
      { status: apiResponse.status || 500 },
    );
  }

  return NextResponse.json(payload, { status: apiResponse.status });
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Sign in before removing thread follows." }, { status: 401 });
  }

  const apiUrl = new URL(buildApiServerUrl("/comment-threads/follows"));
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    apiUrl.searchParams.set(key, value);
  }

  const apiResponse = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!apiResponse.ok) {
    const payload = await readApiJson(apiResponse);
    return NextResponse.json(
      { error: getApiErrorMessage(payload, "Could not remove the thread follow.") },
      { status: apiResponse.status || 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
