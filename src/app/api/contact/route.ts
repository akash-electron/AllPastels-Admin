import { NextRequest } from "next/server";
import { bearerFetch, passthrough } from "@/lib/server/backend";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search || "";
  return passthrough(await bearerFetch(request, `/api/contact${query}`));
}
