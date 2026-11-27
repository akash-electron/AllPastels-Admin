import { NextRequest } from "next/server";
import { bearerFetch, passthrough } from "@/lib/server/backend";

export async function GET(request: NextRequest) {
  return passthrough(await bearerFetch(request, "/api/reviews"));
}
