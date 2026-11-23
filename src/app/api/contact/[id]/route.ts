import { NextRequest } from "next/server";
import { byId } from "@/lib/constants/endpoints";
import { bearerFetch, passthrough, proxyJson } from "@/lib/server/backend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return passthrough(
    await bearerFetch(request, `/api/contact/${encodeURIComponent(id)}`),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyJson(request, byId("/api/contact", id), "PATCH");
}
