"use client";

import { useCallback, useEffect, useState } from "react";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { AlertIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { getDashboardData } from "@/lib/services/analytics.service";
import {
  buildCategoryShares,
  buildSeries,
  buildStats,
  RECENT_ORDER_COUNT,
  toRecentOrderRow,
} from "@/lib/utils/dashboard";
import { getErrorMessage } from "@/lib/utils/error";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/utils/inventory";
import type { AdminOrder } from "@/lib/types/order";
import type { Product } from "@/lib/types/product";

export function DashboardClient() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    DEFAULT_LOW_STOCK_THRESHOLD,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getDashboardData();
      setOrders(data.orders);
      setProducts(data.products);
      setLowStockThreshold(data.lowStockThreshold);
      setLoadError(null);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Failed to load dashboard data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (loading && (orders === null || products === null)) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="rounded-sm border border-line bg-floral-700 px-5 py-4"
            >
              <div className="h-3 w-24 animate-pulse rounded-sm bg-line" />
              <div className="mt-3 h-8 w-20 animate-pulse rounded-sm bg-line" />
              <div className="mt-3 h-4 w-32 animate-pulse rounded-sm bg-line" />
            </div>
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-sm border border-line bg-floral-700" />
      </div>
    );
  }

  if (loadError && (orders === null || products === null)) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
          <AlertIcon className="h-6 w-6 text-powder-400" />
          <p className="text-sm" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="rounded-sm bg-burnt-500 px-4 py-2 text-sm font-medium text-floral transition-colors hover:bg-burnt-400"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  const series = orders !== null && products !== null ? buildSeries(orders) : [];
  const categories =
    orders !== null && products !== null ? buildCategoryShares(orders) : [];
  const stats =
    orders !== null && products !== null
      ? buildStats(orders, products, lowStockThreshold)
      : [];
  const recent =
    orders !== null && products !== null
      ? orders.slice(0, RECENT_ORDER_COUNT).map(toRecentOrderRow)
      : [];

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards stats={stats} />
      <SalesOverview series={series} categories={categories} />
      <OrdersTable
        title="Recent Orders"
        subtitle="Latest 7 orders across the store"
        orders={recent}
        footerUrl="/orders"
      />
    </div>
  );
}
