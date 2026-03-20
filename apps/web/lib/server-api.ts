const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

export const SESSION_COOKIE_NAME = "sokoodds_session";

export function getApiServerBaseUrl() {
  const baseUrl =
    process.env.SOKOODDS_API_SERVER_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_API_BASE_URL;

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildApiServerUrl(path: string) {
  return `${getApiServerBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function readApiJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as unknown;
}

export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return fallback;
}
