export interface StockItem {
  product_id: string;
  product_code: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  purchase_price: number;
  stock_value: number;
}

export interface LedgerEntry {
  type: string;
  quantity: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface AdjustmentRequest {
  product_id: string;
  delta: number;
  reason: string;
}
