export interface PurchaseItemInput {
  product_id: string;
  quantity: number;
  purchase_price: number;
  gst_percentage: number;
}

export interface PurchaseCreate {
  supplier_name: string;
  supplier_id?: string | null;
  purchase_date: string; // YYYY-MM-DD
  items: PurchaseItemInput[];
}

export interface PurchaseItemOut {
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  gst_percentage: number;
  gst_amount: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  total_gst: number;
  status: string;
  created_at: string;
  items: PurchaseItemOut[];
}

export interface PurchaseListItem {
  id: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  status: string;
}
