export type MarginType = "percentage" | "amount";

export interface Product {
  id: string;
  product_code: string;
  name: string;
  unit: string;
  purchase_price: number;
  margin_type: MarginType;
  margin_value: number;
  selling_price: number;
  gst_percentage: number;
  hsn_code: string | null;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
}

export interface ProductUpdate {
  name?: string;
  unit?: string;
  gst_percentage?: number;
  hsn_code?: string | null;
  reorder_level?: number;
  margin_type?: MarginType;
  margin_value?: number;
  is_active?: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductListParams {
  search?: string;
  page: number;
  limit: number;
}

/** Client-side selling-price preview (mirrors backend pricing). */
export function previewSellingPrice(purchasePrice: number, type: MarginType, value: number): number {
  const selling = type === "amount" ? purchasePrice + value : purchasePrice * (1 + value / 100);
  return Math.round(selling * 100) / 100;
}
