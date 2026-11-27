import { NextRequest } from "next/server";
import {
  bearerFetch,
  passthrough,
  proxyJson,
} from "@/lib/server/backend";

export async function GET(request: NextRequest) {
  return passthrough(
    await bearerFetch(request, "/api/inventory/settings"),
  );
}

export async function PUT(request: NextRequest) {
  return proxyJson(request, "/api/inventory/settings", "PUT");
}
