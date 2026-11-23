"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th } from "@/components/ui/Table";
import { PencilIcon, RefreshIcon } from "@/components/icons";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatINR } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/dates";
import { getErrorMessage } from "@/lib/utils/error";
import {
  ORDER_STATUS_FILTERS,
  PAYMENT_STATUS_FILTERS,
  listOrders,
  paymentMethodLabel,
  paymentStatusLabel,
  toBadge,
} from "@/lib/services/orders.service";
import type {
  AdminOrder,
  AdminOrderStatus,
  AdminPaymentStatus,
  OrdersQuery,
} from "@/lib/types/order";

const EMPTY_QUERY: OrdersQuery = {
  q: "",
  status: "",
  paymentStatus: "",
  from: "",
  to: "",
};

function customerOf(order: AdminOrder): {
  name: string;
  email: string;
  detail?: string;
} {
  const name =
    order.customerName?.trim() ||
    order.shippingAddress?.fullName?.trim() ||
    "Guest";
  const email = order.customerEmail?.trim() || "No email";
  const detail = order.shippingAddress
    ? [order.shippingAddress.city, order.shippingAddress.country]
        .filter(Boolean)
        .join(", ")
    : undefined;
  return { name, email, detail: detail || undefined };
}

export function OrdersTablePage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<OrdersQuery>(EMPTY_QUERY);
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrders(query);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery((current) =>
        current.q === searchInput.trim()
          ? current
          : { ...current, q: searchInput.trim() },
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const setFilter = <K extends keyof OrdersQuery>(key: K, value: OrdersQuery[K]) => {
    setQuery((current) => ({ ...current, [key]: value }));
  };

  const hasFilters = Boolean(
    query.q || query.status || query.paymentStatus || query.from || query.to,
  );

  const clearFilters = () => {
    setSearchInput("");
    setQuery(EMPTY_QUERY);
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Search, filter and manage every storefront order."
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

      <Card className="mb-4">
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="flex flex-col gap-1 text-xs text-ash-200 sm:col-span-2">
            Search
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Order number, customer name or email"
              className="ap-input"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash-200">
            Order status
            <select
              value={query.status}
              onChange={(event) =>
                setFilter("status", event.target.value as AdminOrderStatus | "")
              }
              className="ap-input"
            >
              {ORDER_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash-200">
            Payment status
            <select
              value={query.paymentStatus}
              onChange={(event) =>
                setFilter("paymentStatus", event.target.value as AdminPaymentStatus | "")
              }
              className="ap-input"
            >
              {PAYMENT_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash-200">
            From
            <input
              type="date"
              value={query.from}
              onChange={(event) => setFilter("from", event.target.value)}
              className="ap-input"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash-200">
            To
            <input
              type="date"
              value={query.to}
              onChange={(event) => setFilter("to", event.target.value)}
              className="ap-input"
            />
          </label>
        </div>
        {hasFilters ? (
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-ash-200">
            <span>Filters are applied to the server-side order list.</span>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-sm border border-line px-2.5 py-1 transition-colors hover:bg-surface"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Order management"
          subtitle={
            orders === null
              ? "Loading…"
              : `${orders.length} order${orders.length === 1 ? "" : "s"}`
          }
        />
        {loading && orders === null ? (
          <div className="space-y-3 px-5 py-6" aria-busy="true">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="h-4 w-28 animate-pulse rounded-sm bg-line" />
                <div className="h-4 w-40 animate-pulse rounded-sm bg-line" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded-sm bg-line" />
              </div>
            ))}
          </div>
        ) : orders !== null && orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <p className="font-display text-xl">No matching orders</p>
            <p className="text-sm text-ash-200">
              {hasFilters
                ? "Try adjusting your search or filters."
                : "Orders placed on the storefront will appear here."}
            </p>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th className="hidden lg:table-cell">Email</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th align="right">Total</Th>
                <Th className="hidden sm:table-cell">Payment</Th>
                <Th>Order status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody aria-busy={loading}>
              {(orders ?? []).map((order) => {
                const buyer = customerOf(order);
                return (
                  <tr key={order._id} className="transition-colors hover:bg-surface">
                    <Td className="font-medium">
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="hover:text-burnt-400"
                      >
                        {order.orderNumber}
                      </Link>
                    </Td>
                    <Td>
                      <span className="block">{buyer.name}</span>
                      {buyer.detail ? (
                        <span className="block text-xs text-ash-200">
                          {buyer.detail}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="hidden text-ash-200 lg:table-cell">
                      {buyer.email}
                    </Td>
                    <Td className="hidden whitespace-nowrap text-ash-200 md:table-cell">
                      {formatDate(order.createdAt)}
                    </Td>
                    <Td className="text-right">{formatINR(order.total)}</Td>
                    <Td className="hidden sm:table-cell">
                      <span className="block text-xs text-ash-200">
                        {paymentMethodLabel(order.paymentMethod)}
                      </span>
                      <Badge status={paymentStatusLabel(order.paymentStatus)} />
                      {order.paymentMethod === "online" &&
                      order.paymentProvider ? (
                        <span className="mt-1 block text-xs text-ash-300">
                          {order.paymentProvider === "razorpay"
                            ? "Razorpay"
                            : "Stripe"}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge status={toBadge(order.status)} />
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/orders/${order.orderNumber}/edit`}
                        title="Update status"
                        className="inline-block rounded-sm p-2 text-ash-300 hover:bg-floral-400 hover:text-ink"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">
                          Update status of {order.orderNumber}
                        </span>
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
