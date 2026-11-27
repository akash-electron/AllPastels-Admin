import { listOrders } from "@/lib/services/orders.service";
import { listProducts } from "@/lib/services/products.service";
import { getInventorySettings } from "@/lib/services/inventory.service";
import type { AdminOrder } from "@/lib/types/order";
import type { Product } from "@/lib/types/product";

export interface DashboardData {
  orders: AdminOrder[];
  products: Product[];
  lowStockThreshold: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [orders, products, inventorySettings] = await Promise.all([
    listOrders(),
    listProducts(),
    getInventorySettings(),
  ]);
  return {
    orders,
    products,
    lowStockThreshold: inventorySettings.lowStockThreshold,
  };
}
