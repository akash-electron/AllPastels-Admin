export interface AdminReviewProduct {
  id: string;
  name: string;
}

export interface AdminReview {
  id: string;
  product: AdminReviewProduct;
  author: string;
  rating: number;
  title: string;
  body: string;
  sizePurchased: string;
  verifiedPurchase: boolean;
  helpful: number;
  date: string;
  edited: boolean;
}
