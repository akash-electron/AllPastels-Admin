import { formatDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/format";
import { toBadge } from "@/lib/services/orders.service";
import type {
  CategoryShare,
  DashboardStat,
  RecentOrderRow,
  SalesSeriesPoint,
} from "@/lib/types/dashboard";
import type { AdminOrder } from "@/lib/types/order";
import type { Product } from "@/lib/types/product";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/utils/inventory";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const NEW_PRODUCT_WINDOW_DAYS = 30;
export const RECENT_ORDER_COUNT = 7;

function countsAsRevenue(order: AdminOrder): boolean {
  return order.status !== "cancelled";
}

function percentDelta(current: number, previous: number): string | undefined {
  if (previous === 0) {
    return current > 0 ? "New" : undefined;
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

function countDelta(current: number, previous: number): string {
  const diff = current - previous;
  return `${diff >= 0 ? "+" : ""}${diff.toLocaleString("en-IN")} orders`;
}

function inRange(createdAt: string, from: number, to: number): boolean {
  const at = new Date(createdAt).getTime();
  return at >= from && at < to;
}

export function buildSeries(orders: AdminOrder[]): SalesSeriesPoint[] {
  const sold = orders.filter(countsAsRevenue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const series: SalesSeriesPoint[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date(today.getTime() - offset * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    series.push({
      label: start.toLocaleDateString("en-IN", { weekday: "short" }),
      value: sold.reduce((sum, order) => {
        return inRange(order.createdAt, start.getTime(), end.getTime())
          ? sum + order.total
          : sum;
      }, 0),
    });
  }
  return series;
}

export function buildCategoryShares(orders: AdminOrder[]): CategoryShare[] {
  const byCategory = new Map<string, number>();
  let revenue = 0;
  for (const order of orders.filter(countsAsRevenue)) {
    for (const item of order.items) {
      const amount = item.priceAtPurchase * item.qty;
      if (amount <= 0) continue;
      const category = item.product?.category?.trim() || "Other";
      byCategory.set(category, (byCategory.get(category) ?? 0) + amount);
      revenue += amount;
    }
  }
  if (revenue === 0) return [];
  return [...byCategory.entries()]
    .map(([label, amount]) => ({
      label,
      share: Math.round((amount / revenue) * 100),
    }))
    .sort((a, b) => b.share - a.share);
}

export function buildStats(
  orders: AdminOrder[],
  products: Product[],
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
): DashboardStat[] {
  const now = Date.now();
  const sold = orders.filter(countsAsRevenue);
  const revenue = sold.reduce((sum, order) => sum + order.total, 0);

  const revenueThisWeek = sold.reduce(
    (sum, order) =>
      inRange(order.createdAt, now - WEEK_MS, now) ? sum + order.total : sum,
    0,
  );
  const revenuePrevWeek = sold.reduce(
    (sum, order) =>
      inRange(order.createdAt, now - 2 * WEEK_MS, now - WEEK_MS)
        ? sum + order.total
        : sum,
    0,
  );
  const ordersThisWeek = orders.filter((order) =>
    inRange(order.createdAt, now - WEEK_MS, now),
  ).length;
  const ordersPrevWeek = orders.filter((order) =>
    inRange(order.createdAt, now - 2 * WEEK_MS, now - WEEK_MS),
  ).length;

  const lowStock = products.filter(
    (product) => product.stock < lowStockThreshold,
  ).length;
  const newProducts = products.filter((product) =>
    inRange(
      product.createdAt,
      now - NEW_PRODUCT_WINDOW_DAYS * DAY_MS,
      now + DAY_MS,
    ),
  ).length;

  return [
    {
      label: "Total Revenue",
      value: formatINR(revenue),
      delta: percentDelta(revenueThisWeek, revenuePrevWeek),
      up: revenueThisWeek >= revenuePrevWeek,
      note: "vs previous 7 days",
    },
    {
      label: "Orders",
      value: orders.length.toLocaleString("en-IN"),
      delta: countDelta(ordersThisWeek, ordersPrevWeek),
      up: ordersThisWeek >= ordersPrevWeek,
      note: "vs previous 7 days",
    },
    {
      label: "Active Products",
      value: products.length.toLocaleString("en-IN"),
      delta: newProducts > 0 ? `+${newProducts}` : undefined,
      up: true,
      note: lowStock > 0 ? `${lowStock} need restocking` : undefined,
    },
    {
      label: "Low Stock Items",
      value: lowStock.toLocaleString("en-IN"),
      note: `of ${products.length.toLocaleString("en-IN")} active products`,
    },
  ];
}

export function toRecentOrderRow(order: AdminOrder): RecentOrderRow {
  const customer = order.shippingAddress?.fullName?.trim();
  return {
    id: order.orderNumber,
    customer: customer || "Guest",
    detail: order.shippingAddress
      ? [order.shippingAddress.city, order.shippingAddress.country]
          .filter(Boolean)
          .join(", ")
      : undefined,
    items: order.items.reduce((sum, item) => sum + item.qty, 0),
    total: order.total,
    status: toBadge(order.status),
    date: formatDate(order.createdAt),
  };
}
