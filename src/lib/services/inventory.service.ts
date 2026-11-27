import { apiGet, apiPost, apiPut, buildQuery } from "@/lib/api";
import { byId, ENDPOINTS } from "@/lib/constants/endpoints";
import type {
  AdjustStockInput,
  AdjustStockResult,
  InventoryData,
  InventoryQuery,
  InventorySettings,
  StockMovementPage,
  StockMovementQuery,
} from "@/lib/types/inventory";

export function listInventory(query: InventoryQuery = {}): Promise<InventoryData> {
  const suffix = buildQuery({
    q: query.q?.trim(),
    category: query.category,
    status: query.status,
    sort: query.sort,
    order: query.order,
    page: query.page,
    limit: query.limit,
  });
  return apiGet<InventoryData>(`${ENDPOINTS.inventory}${suffix}`);
}

export function getInventorySettings(): Promise<InventorySettings> {
  return apiGet<InventorySettings>(ENDPOINTS.inventorySettings);
}

export function updateInventorySettings(
  input: InventorySettings,
): Promise<InventorySettings> {
  return apiPut<InventorySettings>(ENDPOINTS.inventorySettings, input);
}

export function adjustStock(
  productId: string,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  return apiPost<AdjustStockResult>(
    `${byId(ENDPOINTS.inventory, productId)}/adjust`,
    input,
  );
}

export function listStockMovements(
  query: StockMovementQuery = {},
): Promise<StockMovementPage> {
  const suffix = buildQuery({
    productId: query.productId,
    type: query.type,
    page: query.page,
    limit: query.limit,
  });
  return apiGet<StockMovementPage>(`${ENDPOINTS.inventoryMovements}${suffix}`);
}
