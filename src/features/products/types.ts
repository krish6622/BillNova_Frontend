export interface Product {
  id: string;
  product_code: string;
  name: string;
  category: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  gst_percentage: number;
  hsn_code: string | null;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
}

export type ProductInput = Omit<Product, "id" | "is_active">;

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
