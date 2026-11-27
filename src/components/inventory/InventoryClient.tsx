"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th } from "@/components/ui/Table";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FormNotice } from "@/components/ui/FormNotice";
import { StockAdjustDialog } from "@/components/inventory/StockAdjustDialog";
import { StockHistoryDialog } from "@/components/inventory/StockHistoryDialog";
import { AlertIcon, RefreshIcon } from "@/components/icons";
import { listInventory } from "@/lib/services/inventory.service";
import { getErrorMessage } from "@/lib/utils/error";
import { formatDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/format";
import {
  INVENTORY_SORT_OPTIONS,
  SORT_ORDER_OPTIONS,
  STOCK_STATUS_FILTERS,
  getProductSku,
  stockRowClass,
  stockStatusLabel,
} from "@/lib/utils/inventory";
import type {
  AdjustStockResult,
  InventoryData,
  InventoryProduct,
  InventoryQuery,
  InventorySortField,
  SortOrder,
  StockStatus,
} from "@/lib/types/inventory";

type Notice = { tone: "success" | "error"; message: string };
type HistoryTarget = { productId?: string; name?: string };

const PAGE_SIZES = [10, 20, 50] as const;

const DEFAULT_FILTERS: Required<
  Pick<InventoryQuery, "q" | "category" | "status" | "sort" | "order" | "page" | "limit">
> = {
  q: "",
  category: "",
  status: "",
  sort: "stock",
  order: "asc",
  page: 1,
  limit: 10,
};

function SummaryCard({
  label,
  value,
  note,
  href,
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="ap-eyebrow text-ash-300">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      <p className="mt-2 text-sm text-ash-200">{note}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-sm border border-line bg-floral-700 px-5 py-4 transition-colors hover:border-burnt-400"
      >
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-sm border border-line bg-floral-700 px-5 py-4 text-left transition-colors hover:border-burnt-400"
      >
        {body}
      </button>
    );
  }

  return (
    <article className="rounded-sm border border-line bg-floral-700 px-5 py-4">
      {body}
    </article>
  );
}

function InventorySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="rounded-sm border border-line bg-floral-700 px-5 py-4"
          >
            <div className="h-3 w-24 animate-pulse rounded-sm bg-line" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded-sm bg-line" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded-sm bg-line" />
          </div>
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-sm border border-line bg-floral-700" />
    </div>
  );
}

function ProductThumb({ product }: { product: InventoryProduct }) {
  const image = product.images[0];
  if (image) {
    return (
      <img
        src={image}
        alt=""
        className="h-11 w-11 shrink-0 rounded-sm border border-line object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-display text-sm text-ash-300"
    >
      {product.name.trim().charAt(0).toUpperCase() || "P"}
    </span>
  );
}

export function InventoryClient() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adjusting, setAdjusting] = useState<InventoryProduct | null>(null);
  const [history, setHistory] = useState<HistoryTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listInventory(filters);
      setData(result);
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load inventory"));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.q === search ? current : { ...current, q: search, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  function patchFilters(patch: Partial<InventoryQuery>) {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }

  function resetFilters() {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  }

  function showStatus(status: StockStatus | "") {
    patchFilters({ status });
    setNotice(null);
  }

  function handleSaved(result: AdjustStockResult) {
    setAdjusting(null);
    setNotice({
      tone: "success",
      message: `${result.product.name} stock updated from ${result.movement.previousStock.toLocaleString(
        "en-IN",
      )} to ${result.movement.newStock.toLocaleString("en-IN")} units.`,
    });
    void load();
  }

  const hasFilters =
    search.trim() !== "" || filters.category !== "" || filters.status !== "";
  const summary = data?.summary;
  const pagination = data?.pagination;
  const lowOrOut =
    (summary?.lowStockProducts ?? 0) + (summary?.outOfStockProducts ?? 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels across every product in the catalog, including inactive items."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setHistory({})}
              className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
            >
              Movement history
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                load();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
            >
              <RefreshIcon
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        }
      />

      {notice ? (
        <div className="mb-4">
          <FormNotice tone={notice.tone} message={notice.message} />
        </div>
      ) : null}

      {loadError && data ? (
        <ErrorBanner message={loadError} onRetry={load} className="mb-4" />
      ) : null}

      {loading && data === null ? (
        <InventorySkeleton />
      ) : loadError && data === null ? (
        <Card>
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <AlertIcon className="h-6 w-6 text-powder-400" />
            <p className="text-sm" role="alert">
              {loadError}
            </p>
            <button
              type="button"
              onClick={load}
              className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : data && summary && pagination ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total products"
              value={summary.totalProducts.toLocaleString("en-IN")}
              note="All catalog items"
            />
            <SummaryCard
              label="Low stock"
              value={summary.lowStockProducts.toLocaleString("en-IN")}
              note={
                summary.lowStockThreshold > 0
                  ? `Between 1 and ${summary.lowStockThreshold - 1} units`
                  : "Low-stock alerts are off"
              }
              onClick={() => showStatus("low_stock")}
            />
            <SummaryCard
              label="Out of stock"
              value={summary.outOfStockProducts.toLocaleString("en-IN")}
              note="Needs restocking"
              onClick={() => showStatus("out_of_stock")}
            />
            <SummaryCard
              label="Low-stock alert"
              value={summary.lowStockThreshold.toLocaleString("en-IN")}
              note="Units threshold · configure in Settings"
              href="/settings"
            />
          </div>

          {lowOrOut > 0 ? (
            <div
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-sm bg-cotton-800 px-4 py-3 text-sm text-cotton-100"
            >
              <AlertIcon className="h-4 w-4 shrink-0" />
              <span>
                {summary.outOfStockProducts > 0
                  ? `${summary.outOfStockProducts.toLocaleString("en-IN")} product${
                      summary.outOfStockProducts === 1 ? "" : "s"
                    } out of stock`
                  : null}
                {summary.outOfStockProducts > 0 &&
                summary.lowStockProducts > 0
                  ? " · "
                  : null}
                {summary.lowStockProducts > 0
                  ? `${summary.lowStockProducts.toLocaleString("en-IN")} low on stock`
                  : null}
              </span>
              <span className="flex flex-wrap gap-2">
                {summary.outOfStockProducts > 0 ? (
                  <button
                    type="button"
                    onClick={() => showStatus("out_of_stock")}
                    className="rounded-sm border border-cotton-200 px-2 py-0.5 text-xs transition-colors hover:bg-cotton-700"
                  >
                    Review out of stock
                  </button>
                ) : null}
                {summary.lowStockProducts > 0 ? (
                  <button
                    type="button"
                    onClick={() => showStatus("low_stock")}
                    className="rounded-sm border border-cotton-200 px-2 py-0.5 text-xs transition-colors hover:bg-cotton-700"
                  >
                    Review low stock
                  </button>
                ) : null}
              </span>
            </div>
          ) : null}

          <Card>
            <CardHeader
              title="Stock"
              subtitle={
                loading
                  ? "Updating…"
                  : `${pagination.total.toLocaleString("en-IN")} ${
                      pagination.total === 1 ? "product" : "products"
                    } matching`
              }
            />

            <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="flex flex-1 flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Search</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    maxLength={100}
                    placeholder="Product name, SKU or category"
                    className="ap-input"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Category</span>
                  <select
                    value={filters.category}
                    onChange={(event) =>
                      patchFilters({ category: event.target.value })
                    }
                    className="ap-input min-w-40"
                  >
                    <option value="">All categories</option>
                    {data.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Stock status</span>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      patchFilters({
                        status: event.target.value as StockStatus | "",
                      })
                    }
                    className="ap-input min-w-44"
                  >
                    {STOCK_STATUS_FILTERS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Sort by</span>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      patchFilters({
                        sort: event.target.value as InventorySortField,
                      })
                    }
                    className="ap-input min-w-44"
                  >
                    {INVENTORY_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Order</span>
                  <select
                    value={filters.order}
                    onChange={(event) =>
                      patchFilters({
                        order: event.target.value as SortOrder,
                      })
                    }
                    className="ap-input min-w-36"
                  >
                    {SORT_ORDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="ap-eyebrow text-ash-300">Rows</span>
                  <select
                    value={filters.limit}
                    onChange={(event) =>
                      patchFilters({ limit: Number(event.target.value) })
                    }
                    className="ap-input min-w-24"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasFilters}
                  className="rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface disabled:opacity-60"
                >
                  Reset filters
                </button>
              </div>
            </div>

            {data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                <p className="font-display text-xl">
                  {hasFilters ? "No matching products" : "No products yet"}
                </p>
                <p className="text-sm text-ash-200">
                  {hasFilters
                    ? "Try a different search, category or stock status."
                    : "Products added to the catalog will appear here."}
                </p>
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 rounded-sm border border-line px-4 py-2 text-sm transition-colors hover:bg-surface"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Category</Th>
                    <Th align="right">Price</Th>
                    <Th align="right">Stock</Th>
                    <Th align="right">Alert at</Th>
                    <Th>Status</Th>
                    <Th className="hidden lg:table-cell">Updated</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody aria-busy={loading}>
                  {data.items.map((product) => (
                    <tr
                      key={product._id}
                      className={`transition-colors hover:bg-surface ${stockRowClass(product.stockStatus)}`}
                    >
                      <Td>
                        <span className="flex items-center gap-3">
                          <ProductThumb product={product} />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                              <span className="max-w-[18rem] truncate">
                                {product.name}
                              </span>
                              {!product.isActive ? (
                                <Badge status="Inactive" />
                              ) : null}
                            </span>
                            <span className="block font-mono text-xs text-ash-200">
                              {getProductSku(product)}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td className="text-ash-200">
                        {product.category || "—"}
                      </Td>
                      <Td className="text-right">{formatINR(product.price)}</Td>
                      <Td className="text-right font-medium">
                        {product.stock.toLocaleString("en-IN")}
                      </Td>
                      <Td className="text-right text-ash-200">
                        {summary.lowStockThreshold.toLocaleString("en-IN")}
                      </Td>
                      <Td>
                        <Badge status={stockStatusLabel(product.stockStatus)} />
                      </Td>
                      <Td className="hidden whitespace-nowrap text-ash-200 lg:table-cell">
                        {formatDate(product.updatedAt)}
                      </Td>
                      <Td className="text-right">
                        <span className="inline-flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setAdjusting(product)}
                            className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface"
                          >
                            Adjust stock
                            <span className="sr-only"> for {product.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setHistory({
                                productId: product._id,
                                name: product.name,
                              })
                            }
                            className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface"
                          >
                            History
                            <span className="sr-only"> for {product.name}</span>
                          </button>
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-sm">
              <p className="text-ash-200">
                {pagination.total === 0
                  ? "No products"
                  : `Showing ${(
                      (pagination.page - 1) * pagination.limit +
                      1
                    ).toLocaleString("en-IN")}–${(
                      (pagination.page - 1) * pagination.limit +
                      data.items.length
                    ).toLocaleString("en-IN")} of ${pagination.total.toLocaleString(
                      "en-IN",
                    )}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    patchFilters({ page: Math.max(1, filters.page - 1) })
                  }
                  disabled={loading || pagination.page <= 1}
                  className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-ash-200">
                  Page {pagination.totalPages === 0 ? 0 : pagination.page} of{" "}
                  {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => patchFilters({ page: filters.page + 1 })}
                  disabled={
                    loading ||
                    pagination.totalPages === 0 ||
                    pagination.page >= pagination.totalPages
                  }
                  className="rounded-sm border border-line px-3 py-1.5 text-xs transition-colors hover:bg-surface disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {adjusting ? (
        <StockAdjustDialog
          key={adjusting._id}
          product={adjusting}
          lowStockThreshold={summary?.lowStockThreshold ?? 10}
          onClose={() => setAdjusting(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {history ? (
        <StockHistoryDialog
          productId={history.productId}
          productName={history.name}
          onClose={() => setHistory(null)}
        />
      ) : null}
    </>
  );
}
