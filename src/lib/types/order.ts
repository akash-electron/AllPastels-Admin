export type AdminOrderStatus =
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type AdminPaymentMethod = "cod" | "online";
export type AdminPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface AdminOrderProduct {
  _id: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  stock: number;
  sizes: string[];
  isActive: boolean;
  // Not part of the current backend Product model; rendered only when the API
  // supplies them so the UI never invents SKU or colour values.
  sku?: string;
  color?: string;
}

export interface AdminOrderItem {
  product: AdminOrderProduct | null;
  qty: number;
  priceAtPurchase: number;
  size?: string;
  // Optional variant snapshot, only shown when present.
  color?: string;
}

export interface AdminOrderAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface AdminOrderCoupon {
  code: string;
  type: string;
  value: number;
  amount: number;
}

export interface AdminOrderShippingMethod {
  flatRate: number;
  freeShippingThreshold: number | null;
  free: boolean;
}

export interface AdminOrderStatusEntry {
  status: AdminOrderStatus;
  at: string;
  by: string | null;
  note?: string;
}

export interface AdminOrderNote {
  _id: string;
  text: string;
  by: string | null;
  at: string;
}

export interface AdminOrder {
  _id: string;
  user: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
  shippingAddress: AdminOrderAddress | null;
  // The current backend stores only a shipping address. Render a billing
  // address when a future/legacy order payload includes one.
  billingAddress?: AdminOrderAddress | null;
  orderNumber: string;
  items: AdminOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon: AdminOrderCoupon | null;
  shippingMethod: AdminOrderShippingMethod | null;
  taxRatePercent: number | null;
  paymentMethod: AdminPaymentMethod;
  paymentStatus: AdminPaymentStatus;
  paymentReference?: string | null;
  paidAt?: string | null;
  paymentProvider?: "razorpay" | "stripe" | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  amountMinor?: number | null;
  currency?: "INR" | null;
  status: AdminOrderStatus;
  stockRestored: boolean;
  statusHistory: AdminOrderStatusEntry[];
  adminNotes?: AdminOrderNote[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersQuery {
  q?: string;
  status?: AdminOrderStatus | "";
  paymentStatus?: AdminPaymentStatus | "";
  from?: string;
  to?: string;
}
