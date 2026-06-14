export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string | null;
  is_gst_customer: boolean;
  customer_gstin: string | null;
  billing_type: "WITH_GST" | "WITHOUT_GST";
  grand_total: number;
  payment_modes: string[];
  cashier_name: string | null;
  show_gst_on_invoice: boolean;
  status: "active" | "void";
}

export interface InvoiceFilters {
  page: number;
  limit: number;
  date_from?: string;
  date_to?: string;
  invoice_number?: string;
  payment_mode?: string;
  cashier_id?: string;
  status?: "active" | "void" | "";
  billing_type?: "WITH_GST" | "WITHOUT_GST" | "";
}

export interface Cashier {
  id: string;
  name: string;
}
