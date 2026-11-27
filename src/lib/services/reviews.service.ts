import { apiDelete, apiGet } from "@/lib/api";
import { byId, ENDPOINTS } from "@/lib/constants/endpoints";
import type { AdminReview } from "@/lib/types/review";

export function listReviews(): Promise<AdminReview[]> {
  return apiGet<AdminReview[]>(ENDPOINTS.reviews);
}

export function deleteReview(id: string): Promise<void> {
  return apiDelete<void>(byId(ENDPOINTS.reviews, id));
}

export function reviewDateText(review: AdminReview): string {
  const date = new Date(review.date);
  if (Number.isNaN(date.getTime())) return review.date;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
