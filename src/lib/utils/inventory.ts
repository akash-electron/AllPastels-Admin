import type { Product } from "@/lib/types/product";
import type {
  InventoryQuery,
  InventorySortField,
  SortOrder,
  StockAdjustMode,
  StockMovement,
  StockMovementType,
  StockStatus,
} from "@/lib/types/inventory";

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const MAX_STOCK = 10_000_000;

export const STOCK_STATUS_FILTERS: {
  value: InventoryQuery["status"];
  label: string;
}[] = [
  { value: "", label: "All stock statuses" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

export const INVENTORY_SORT_OPTIONS: {
  value: InventorySortField;
  label: string;
}[] = [
  { value: "stock", label: "Stock quantity" },
  { value: "name", label: "Product name" },
  { value: "sku", label: "SKU" },
  { value: "category", label: "Category" },
  { value: "price", label: "Price" },
  { value: "updatedAt", label: "Last updated" },
];

export const SORT_ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

export const STOCK_ADJUST_MODES: {
  value: StockAdjustMode;
  label: string;
  hint: string;
}[] = [
  { value: "add", label: "Add stock", hint: "Increase the quantity on hand" },
  { value: "remove", label: "Remove stock", hint: "Decrease the quantity on hand" },
  { value: "set", label: "Set quantity", hint: "Replace the quantity on hand" },
];

export const STOCK_ADJUST_REASONS = [
  "Restock received",
  "Customer return",
  "Damaged or expired",
  "Inventory correction",
  "Stock transfer",
  "Other",
] as const;

export const MOVEMENT_TYPE_FILTERS: {
  value: StockMovementType | "";
  label: string;
}[] = [
  { value: "", label: "All movement types" },
  { value: "adjustment", label: "Manual adjustment" },
  { value: "order", label: "Order placed" },
  { value: "cancellation", label: "Order cancelled" },
  { value: "product_update", label: "Product form update" },
  { value: "initial", label: "Initial stock" },
];

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  adjustment: "Manual adjustment",
  order: "Order placed",
  cancellation: "Order cancelled",
  product_update: "Product form update",
  initial: "Initial stock",
};

export function getStockStatus(
  stock: number,
  threshold: number,
): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock < threshold) return "low_stock";
  return "in_stock";
}

export function stockStatusLabel(status: StockStatus): string {
  if (status === "out_of_stock") return "Out of stock";
  if (status === "low_stock") return "Low stock";
  return "In stock";
}

export function stockRowClass(status: StockStatus): string {
  if (status === "out_of_stock") return "bg-cotton-500/10";
  if (status === "low_stock") return "bg-cotton-800/15";
  return "";
}

/** Mirrors the backend's stable SKU fallback for legacy products. */
export function deriveSku(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `AP-${cleaned.slice(-8)}`;
}

export function getProductSku(product: Pick<Product, "_id" | "sku">): string {
  const sku = product.sku?.trim();
  return sku ? sku : deriveSku(product._id);
}

export function movementTypeLabel(type: StockMovementType): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function movementDeltaLabel(delta: number): string {
  if (delta > 0) return `+${delta.toLocaleString("en-IN")}`;
  return delta.toLocaleString("en-IN");
}

export function movementActorName(
  movement: Pick<StockMovement, "by">,
): string {
  if (!movement.by) return "System";
  if (typeof movement.by === "string") return "Admin";
  return movement.by.name?.trim() || "Admin";
}

export function movementModeLabel(mode: StockAdjustMode | null): string {
  if (mode === "add") return "Add";
  if (mode === "remove") return "Remove";
  if (mode === "set") return "Set";
  return "—";
}
