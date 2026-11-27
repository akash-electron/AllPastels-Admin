import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { byId, ENDPOINTS } from "@/lib/constants/endpoints";
import type { DeleteResult, Product, ProductInput } from "@/lib/types/product";

export function listProducts(): Promise<Product[]> {
  return apiGet<Product[]>(ENDPOINTS.products);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiPost<Product>(ENDPOINTS.products, input);
}

export function updateProduct(
  id: string,
  input: ProductInput,
): Promise<Product> {
  return apiPut<Product>(byId(ENDPOINTS.products, id), input);
}

export function updateProductStock(
  id: string,
  stock: number,
): Promise<Product> {
  return apiPut<Product>(byId(ENDPOINTS.products, id), { stock });
}

export function deleteProduct(id: string): Promise<DeleteResult> {
  return apiDelete<DeleteResult>(byId(ENDPOINTS.products, id));
}
