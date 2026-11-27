export const ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  products: "/api/products",
  inventory: "/api/inventory",
  inventorySettings: "/api/inventory/settings",
  inventoryMovements: "/api/inventory/movements",
  orders: "/api/orders",
  contact: "/api/contact",
  coupons: "/api/coupons",
  reviews: "/api/reviews",
  settings: {
    checkout: "/api/settings/checkout",
  },
  uploads: "/api/uploads",
} as const;

export function byId(base: string, id: string): string {
  return `${base}/${encodeURIComponent(id)}`;
}
