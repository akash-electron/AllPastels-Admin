import { NextRequest } from "next/server";
import { byId } from "@/lib/constants/endpoints";
import { proxyMutation } from "@/lib/server/backend";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyMutation(request, byId("/api/reviews", id), {
    method: "DELETE",
  });
}
