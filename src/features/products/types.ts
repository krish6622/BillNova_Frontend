export interface Product {
  id: string;
  product_code: string;
  name: string;
  unit: string;
  purchase_price: number;
  markup_amount: number;
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
  markup_amount?: number;
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

// Pricing formulas live in the single shared engine (src/lib/pricing.ts). Re-exported
// here under the existing name for backward-compatible imports — no duplicate math.
export { customerPriceExclusive, inclusiveBreakup } from "@/lib/pricing";
export { sellingPrice as previewSellingPrice } from "@/lib/pricing";
