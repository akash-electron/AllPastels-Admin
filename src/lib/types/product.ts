export interface Product {
  _id: string;
  /** Stable stock-keeping unit. Older records may omit it; the UI derives one. */
  sku?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  sizes: string[];
  isActive: boolean;
  /** SEO copy. Empty string means the storefront uses its generated defaults. */
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  /** Alt text for the product's images on the storefront. */
  imageAlt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  sizes: string[];
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  imageAlt: string;
}

export interface DeleteResult {
  id: string;
  isActive: boolean;
}
