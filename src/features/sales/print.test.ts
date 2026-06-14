import { describe, expect, it } from "vitest";

import { customerUnitRate, netUnitRate, thermalLineItems } from "@/lib/pricing";
import type { Invoice } from "@/features/sales/types";

import { receiptInnerHTML } from "./print";

// Canonical CR-6 example: selling 200, GST 5%, qty 3 -> taxable 600, gst 30, line_total 630.
// `showGst` is now a PER-BILL flag stored on the sale (CR-7).
function makeInvoice(opts?: { showGst?: boolean; business?: Partial<Invoice["business"]> }): Invoice {
  return {
    business: {
      business_name: "Krish Retail",
      address: "No.12 Anna Nagar, Chennai - 600040",
      mobile: "9876543210",
      email: "shop@krish.in",
      gst_number: null,
      invoice_footer: null,
      invoice_type: "thermal_80",
      show_branding: true,
      ...opts?.business,
    },
    sale: {
      id: "s1",
      invoice_number: "INV-2026-0006",
      gst_mode: "exclusive",
      place_of_supply: "intra",
      status: "active",
      customer_name: null,
      is_gst_customer: false,
      customer_mobile: null,
      customer_gstin: null,
      billing_type: "WITH_GST",
      cashier_name: "Admin",
      show_gst_on_invoice: opts?.showGst ?? false,
      notes: null,
      created_at: "2026-06-13T16:50:00Z",
      voided_at: null,
      total_taxable: 600,
      total_discount: 0,
      total_cgst: 15,
      total_sgst: 15,
      total_igst: 0,
      total_gst: 30,
      grand_total: 630,
      items: [
        {
          product_id: "p1", product_name: "Milk", hsn_code: null, quantity: 3, unit: "NOS",
          unit_price: 200, gst_percentage: 5, discount: 0, taxable_value: 600,
          cgst: 15, sgst: 15, igst: 0, line_total: 630, notes: null,
        },
      ],
      payments: [{ mode: "Cash", amount: 630, reference: null }],
    },
  };
}

describe("shared display-rate helpers", () => {
  it("hidden rate is the customer (GST-inclusive) per-unit price", () => {
    expect(customerUnitRate(630, 3)).toBe(210);
  });
  it("visible rate is the net (pre-GST) per-unit price", () => {
    expect(netUnitRate(600, 3)).toBe(200);
  });
  it("thermalLineItems guarantees qty × rate === amount in BOTH modes", () => {
    const items = makeInvoice().sale.items;
    const hidden = thermalLineItems(items, false)[0];
    expect(hidden.rate).toBe(210);
    expect(hidden.amount).toBe(630);
    expect(hidden.qty * hidden.rate).toBe(hidden.amount);

    const visible = thermalLineItems(items, true)[0];
    expect(visible.rate).toBe(200);
    expect(visible.amount).toBe(600);
    expect(visible.qty * visible.rate).toBe(visible.amount);
  });
});

describe("receiptInnerHTML — GST hidden (default)", () => {
  const html = receiptInnerHTML(makeInvoice(), 80);
  it("shows customer rate 210.00 and amount 630.00 (3 × 210 = 630)", () => {
    expect(html).toContain(">210.00<");
    expect(html).toContain(">630.00<");
  });
  it("does NOT show a GST breakup line", () => {
    expect(html).not.toContain("GST (");
  });
  it("shows TOTAL, CASH and BALANCE", () => {
    expect(html).toContain("TOTAL");
    expect(html).toContain("CASH");
    expect(html).toContain("BALANCE");
  });
  it("renders the Powered by BillNova line when branding is on", () => {
    expect(html).toContain("Powered by BillNova");
  });
  it("omits branding when disabled", () => {
    expect(receiptInnerHTML(makeInvoice({ business: { show_branding: false } }), 80)).not.toContain("Powered by BillNova");
  });
});

describe("receiptInnerHTML — GST visible", () => {
  const html = receiptInnerHTML(makeInvoice({ showGst: true }), 80);
  it("shows selling rate 200.00, taxable amount 600.00 and a GST (5%) line of 30.00", () => {
    expect(html).toContain(">200.00<");
    expect(html).toContain(">600.00<");
    expect(html).toContain("GST (5%)");
    expect(html).toContain(">30.00<");
  });
  it("still totals to 630.00", () => {
    expect(html).toContain("₹630.00");
  });
});

describe("header", () => {
  it("shows cashier and defaults customer to Walk-in", () => {
    const html = receiptInnerHTML(makeInvoice(), 80);
    expect(html).toContain("Admin");
    expect(html).toContain("Walk-in");
  });
  it("shows GSTIN only when configured", () => {
    expect(receiptInnerHTML(makeInvoice(), 80)).not.toContain("GSTIN");
    expect(receiptInnerHTML(makeInvoice({ business: { gst_number: "33ABCDE1234F1Z5" } }), 80)).toContain("GSTIN: 33ABCDE1234F1Z5");
  });
});
