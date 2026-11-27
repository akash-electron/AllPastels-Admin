import type { Product } from "./product";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type StockAdjustMode = "add" | "remove" | "set";

export type StockMovementType =
  | "adjustment"
  | "order"
  | "cancellation"
  | "product_update"
  | "initial";

export interface InventoryProduct extends Product {
  stockStatus: StockStatus;
}

export interface InventorySummary {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  lowStockThreshold: number;
}

export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InventoryData {
  items: InventoryProduct[];
  categories: string[];
  summary: InventorySummary;
  pagination: InventoryPagination;
}

export interface InventorySettings {
  lowStockThreshold: number;
}

export type InventorySortField =
  | "name"
  | "sku"
  | "category"
  | "stock"
  | "price"
  | "updatedAt";

export type SortOrder = "asc" | "desc";

export interface InventoryQuery {
  q?: string;
  category?: string;
  status?: StockStatus | "";
  sort?: InventorySortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

export interface StockMovementProduct {
  _id: string;
  name: string;
  sku?: string;
  images?: string[];
  category?: string;
  stock?: number;
}

export interface StockMovementActor {
  _id: string;
  name?: string;
}

export interface StockMovement {
  _id: string;
  product: StockMovementProduct | null;
  type: StockMovementType;
  mode: StockAdjustMode | null;
  quantity: number;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note?: string;
  reference?: string;
  by: StockMovementActor | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementQuery {
  productId?: string;
  type?: StockMovementType | "";
  page?: number;
  limit?: number;
}

export interface StockMovementPage {
  items: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdjustStockInput {
  mode: StockAdjustMode;
  quantity: number;
  reason: string;
  note?: string;
}

export interface AdjustStockResult {
  product: InventoryProduct;
  movement: StockMovement;
}
