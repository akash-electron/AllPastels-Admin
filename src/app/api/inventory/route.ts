import { NextRequest } from "next/server";
import { bearerFetch, passthrough } from "@/lib/server/backend";

export async function GET(request: NextRequest) {
  const search = new URL(request.url).searchParams.toString();
  const suffix = search ? `?${search}` : "";
  return passthrough(await bearerFetch(request, `/api/inventory${suffix}`));
}
