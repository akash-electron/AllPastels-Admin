"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td, Th } from "@/components/ui/Table";
import { StarIcon, RefreshIcon, TrashIcon, SearchIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { getErrorMessage } from "@/lib/utils/error";
import {
  deleteReview,
  listReviews,
  reviewDateText,
} from "@/lib/services/reviews.service";
import type { AdminReview } from "@/lib/types/review";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? "text-burnt-300" : "text-ash-300"
          }`}
          fill={star <= rating ? "currentColor" : "none"}
        />
      ))}
      <span className="ml-1.5 text-xs tabular-nums text-ash-200">{rating}/5</span>
    </span>
  );
}

export function ReviewsTablePage() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listReviews();
      setReviews(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load reviews"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleDelete(review: AdminReview) {
    setDeleteBusy(true);
    try {
      await deleteReview(review.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete review"));
    } finally {
      setDeleteBusy(false);
    }
  }

  const visible = useMemo(() => {
    if (!reviews) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return reviews;
    return reviews.filter((review) =>
      [review.product.name, review.author, review.title, review.body]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [reviews, query]);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Customer ratings and written reviews across every product."
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      <Card>
        <CardHeader
          title="All Reviews"
          subtitle={
            reviews === null
              ? "Loading…"
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`
          }
          action={
            <label className="relative block">
              <span className="sr-only">Search reviews</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash-300" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Product, customer or words"
                className="w-full rounded-sm border border-line bg-floral py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-burnt-400 sm:w-72"
              />
            </label>
          }
        />

        {loading && reviews === null ? (
          <div className="space-y-3 px-5 py-6" aria-busy="true">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-4 w-40 animate-pulse rounded-sm bg-line" />
                <div className="h-4 w-24 animate-pulse rounded-sm bg-line" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded-sm bg-line" />
              </div>
            ))}
          </div>
        ) : visible !== null && visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <p className="font-display text-xl">
              {reviews && reviews.length > 0 ? "No matching reviews" : "No reviews yet"}
            </p>
            <p className="text-sm text-ash-200">
              {reviews && reviews.length > 0
                ? "Try a different search term."
                : "Reviews submitted on the storefront will appear here."}
            </p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Rating</Th>
                <Th>Review</Th>
                <Th className="hidden md:table-cell">Customer</Th>
                <Th className="hidden lg:table-cell">Submitted</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody aria-busy={loading}>
              {visible?.map((review) => (
                <tr key={review.id} className="transition-colors hover:bg-surface">
                  <Td>
                    <span className="block max-w-[14rem] truncate font-medium">
                      {review.product.name}
                    </span>
                    {review.sizePurchased ? (
                      <span className="block text-xs text-ash-200">
                        Size {review.sizePurchased}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <Stars rating={review.rating} />
                  </Td>
                  <Td>
                    <div className="max-w-md whitespace-normal">
                      <span className="block font-medium">{review.title}</span>
                      <span className="mt-1 line-clamp-2 block text-xs text-ash-200">
                        {review.body}
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ash-300">
                        {review.verifiedPurchase ? <span>Verified purchase</span> : null}
                        {review.edited ? <span>Edited</span> : null}
                        {review.helpful > 0 ? (
                          <span>{review.helpful} found helpful</span>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-ash-200">{review.author}</span>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-ash-200 lg:table-cell">
                    {reviewDateText(review)}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      title="Delete review"
                      onClick={() => setDeleting(review)}
                      className="rounded-sm p-2 text-ash-300 hover:bg-cotton-500 hover:text-cotton-100"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">
                        Delete review by {review.author} for {review.product.name}
                      </span>
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {deleting ? (
        <ConfirmDialog
          ariaLabel="Confirm delete review"
          title="Delete review?"
          busy={deleteBusy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        >
          The review by <span className="font-medium">{deleting.author}</span> for{" "}
          <span className="font-medium">{deleting.product.name}</span> will be
          permanently removed, and the product&apos;s rating will be recalculated.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
