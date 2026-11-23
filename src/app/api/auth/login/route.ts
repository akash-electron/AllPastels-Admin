import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  backendFetch,
  jsonError,
  setSessionCookie,
} from "@/lib/server/backend";

interface LoginPayload {
  email?: unknown;
  password?: unknown;
}

interface LoginResponse {
  success?: boolean;
  message?: string;
  token?: unknown;
}

export async function POST(request: NextRequest) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  let body: LoginPayload;
  try {
    body = (await request.json()) as LoginPayload;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.email.trim().length === 0 ||
    body.password.length === 0
  ) {
    return jsonError("Email and password are required", 400);
  }

  // Admin-only endpoint: issues a 12h token with the admin audience, which the
  // backend's requireAdmin insists on (a storefront token is refused).
  const response = await backendFetch("/api/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email.trim(),
      password: body.password,
    }),
  });

  let payload: LoginResponse | null = null;
  try {
    payload = (await response.json()) as LoginResponse;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    return NextResponse.json(
      {
        success: false,
        message:
          payload?.message ??
          `Login failed with status ${response.status}`,
      },
      { status: response.ok ? 502 : response.status },
    );
  }

  if (typeof payload.token !== "string" || payload.token.length === 0) {
    return jsonError("Login response did not include a token", 502);
  }

  const result = NextResponse.json({ success: true });
  setSessionCookie(payload.token, result);
  return result;
}
