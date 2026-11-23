import { NextRequest, NextResponse } from "next/server";
import type { NextResponse as NextResponseType } from "next/server";
import { applyProxyHeaders } from "./proxyHeaders";

export const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:5000";

export const SESSION_COOKIE = "ap_admin_session";
const COOKIE_MAX_AGE_FALLBACK = 7 * 24 * 60 * 60;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function jsonError(message: string, status: number): NextResponseType {
  return NextResponse.json({ success: false, message }, { status });
}

export function sessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

// HTTPS-only browsers send Origin on POST/PUT/DELETE; a mismatch (or
// absence) blocks the mutation. SameSite=Lax cookies add a second layer.
export function assertSameOrigin(request: NextRequest): NextResponseType | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return jsonError("Request blocked: origin could not be verified", 403);
  }
  try {
    if (new URL(origin).host !== host) {
      return jsonError("Cross-origin request blocked", 403);
    }
  } catch {
    return jsonError("Request blocked: invalid origin", 403);
  }
  return null;
}

function jwtMaxAge(token: string): number | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(
      Buffer.from(
        payloadPart.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    if (typeof payload.exp === "number" && payload.exp > 0) {
      return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    }
  } catch {
    // Unparseable JWT: caller falls back to the default lifetime.
  }
  return null;
}

export function setSessionCookie(token: string, response: NextResponseType) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: jwtMaxAge(token) ?? COOKIE_MAX_AGE_FALLBACK,
  });
}

export function clearSessionCookie(response: NextResponseType) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0,
  });
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  await applyProxyHeaders(headers);
  return fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init, headers });
}

export async function passthrough(response: Response): Promise<NextResponseType> {
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function bearerFetch(
  request: NextRequest,
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response> {
  const token = sessionToken(request);
  if (!token) {
    return jsonError("Not logged in", 401);
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return backendFetch(path, { ...init, headers });
}

export async function proxyMutation(
  request: NextRequest,
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<NextResponseType> {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  return passthrough(await bearerFetch(request, path, init));
}

export async function proxyJson(
  request: NextRequest,
  path: string,
  method: "POST" | "PUT" | "PATCH",
): Promise<NextResponseType> {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const body = await request.text();
  if (body.length === 0) {
    return jsonError("Request body is required", 400);
  }

  return passthrough(
    await bearerFetch(request, path, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}
