import { NextRequest } from "next/server";
import { byId } from "@/lib/constants/endpoints";
import { proxyJson } from "@/lib/server/backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  return proxyJson(request, `${byId("/api/inventory", productId)}/adjust`, "POST");
}
