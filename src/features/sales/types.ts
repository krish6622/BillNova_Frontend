export interface SaleItemInput {
  product_id: string;
  quantity: number;
  discount?: number;
  notes?: string | null;
}

export interface PaymentInput {
  mode: "Cash" | "UPI" | "Card";
  amount: number;
  reference?: string | null;
}

export type BillingType = "WITH_GST" | "WITHOUT_GST";

export interface PreviewRequest {
  gst_mode?: "inclusive" | "exclusive" | null;
  place_of_supply?: "intra" | "inter" | null;
  items: SaleItemInput[];
  bill_discount?: number;
  billing_type?: BillingType;
}

export interface CreateSaleRequest extends PreviewRequest {
  notes?: string | null;
  customer_name?: string | null;
  is_gst_customer?: boolean;
  customer_mobile?: string | null;
  customer_gstin?: string | null;
  show_gst_on_invoice?: boolean;
  payments: PaymentInput[];
}

export interface Totals {
  total_taxable: number;
  total_discount: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_gst: number;
  grand_total: number;
}

export interface PreviewLine {
  product_id: string;
  product_name: string;
  hsn_code: string | null;
  quantity: number;
  unit_price: number;
  gst_percentage: number;
  discount: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  line_total: number;
}

export interface PreviewResponse {
  gst_mode: string;
  place_of_supply: string;
  billing_type: BillingType;
  items: PreviewLine[];
  totals: Totals;
}

export interface SaleItem extends PreviewLine {
  unit: string;
  notes: string | null;
}

export interface Payment {
  mode: string;
  amount: number;
  reference: string | null;
}

export interface Sale extends Totals {
  id: string;
  invoice_number: string;
  gst_mode: string;
  place_of_supply: string;
  status: "active" | "void";
  customer_name: string | null;
  is_gst_customer: boolean;
  customer_mobile: string | null;
  customer_gstin: string | null;
  billing_type: BillingType;
  cashier_name: string | null;
  show_gst_on_invoice: boolean;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
  items: SaleItem[];
  payments: Payment[];
}

export interface SaleListItem {
  id: string;
  invoice_number: string;
  grand_total: number;
  created_at: string;
}

export interface InvoiceBusiness {
  business_name: string;
  gst_number: string | null;
  mobile: string;
  email: string;
  address: string | null;
  invoice_footer: string | null;
  invoice_type: "thermal_80" | "thermal_58" | "a4";
  show_branding: boolean;
}

export interface Invoice {
  business: InvoiceBusiness;
  sale: Sale;
}
