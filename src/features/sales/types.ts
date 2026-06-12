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

export interface PreviewRequest {
  gst_mode?: "inclusive" | "exclusive" | null;
  place_of_supply?: "intra" | "inter" | null;
  items: SaleItemInput[];
  bill_discount?: number;
}

export interface CreateSaleRequest extends PreviewRequest {
  notes?: string | null;
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
  items: PreviewLine[];
  totals: Totals;
}

export interface SaleItem extends PreviewLine {
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
  notes: string | null;
  created_at: string;
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
}

export interface Invoice {
  business: InvoiceBusiness;
  sale: Sale;
}
