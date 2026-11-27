import type { Metadata } from "next";
import { ReviewsTablePage } from "@/components/reviews/ReviewsTablePage";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <ReviewsTablePage />;
}
