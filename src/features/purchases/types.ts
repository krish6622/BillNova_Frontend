export interface PurchaseItemInput {
  product_id?: string | null; // existing product
  product_code?: string | null; // new (optional → auto PD-#####)
  product_name?: string | null; // required for new
  hsn_code?: string | null;
  gst_percentage: number;
  unit?: string;
  purchase_price: number;
  markup_amount: number;
  quantity: number;
}

export interface PurchaseCreate {
  supplier_name: string;
  supplier_id?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
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
  invoice_number: string | null;
  notes: string | null;
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
  invoice_number: string | null;
  purchase_date: string;
  total_amount: number;
  status: string;
}
