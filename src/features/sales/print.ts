import { api } from "@/lib/api";
import { round2, thermalLineItems } from "@/lib/pricing";

import type { Invoice } from "./types";

export type InvoiceType = "thermal_80" | "thermal_58" | "a4";

const inr = (n: number) => "₹" + (Math.round(n * 100) / 100).toFixed(2);
const amt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/**
 * The thermal receipt BODY (shared by the printed slip and the on-screen side preview, so
 * the two never diverge). 80mm ≈ 302px, 58mm ≈ 219px. Monospace, supermarket-style.
 *
 * Honours show_gst_on_invoice: when false the tax breakup is hidden but the grand total
 * still INCLUDES GST (CR-4) — it is never reduced to the pre-tax amount.
 */
export function receiptInnerHTML(invoice: Invoice, widthMm: 80 | 58 = 80): string {
  const { business, sale } = invoice;
  const showGst = sale.show_gst_on_invoice; // CR-7: per-bill, frozen on the sale
  const date = new Date(sale.created_at);

  // CR-6: single shared line builder — guarantees qty × rate = amount on every row.
  const lines = thermalLineItems(sale.items, showGst);
  const rows = lines
    .map(
      (l) => `
      <tr>
        <td class="iname">${esc(l.name)}</td>
        <td class="r">${(+l.qty).toString()}</td>
        <td class="r">${amt(l.rate)}</td>
        <td class="r">${amt(l.amount)}</td>
      </tr>`,
    )
    .join("");

  // GST-visible: one consolidated GST line (with the rate if all items share it).
  const rates = [...new Set(sale.items.map((i) => +i.gst_percentage))];
  const gstLabel = rates.length === 1 ? `GST (${rates[0]}%)` : "GST";
  const gstRow =
    showGst && sale.total_gst
      ? `<div class="line"><span>${gstLabel}</span><span>${amt(sale.total_gst)}</span></div>`
      : "";

  const paid = sale.payments.reduce((s, p) => s + p.amount, 0);
  const balance = round2(paid - sale.grand_total);
  const payments = sale.payments
    .map((p) => `<div class="line"><span>${esc(p.mode.toUpperCase())}</span><span>${amt(p.amount)}</span></div>`)
    .join("");
  const voidBadge = sale.status === "void" ? `<div class="void">*** VOID ***</div>` : "";

  return `
  <div class="receipt w${widthMm}">
    ${voidBadge}
    <div class="center bold biz">${esc(business.business_name)}</div>
    ${business.address ? `<div class="center muted">${esc(business.address)}</div>` : ""}
    <div class="center muted">Ph: ${esc(business.mobile)}</div>
    ${business.gst_number ? `<div class="center muted">GSTIN: ${esc(business.gst_number)}</div>` : ""}
    <div class="sep"></div>
    <div class="line"><span>Bill No</span><span>${esc(sale.invoice_number)}</span></div>
    <div class="line"><span>Date</span><span>${date.toLocaleDateString("en-IN")} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
    <div class="line"><span>Cashier</span><span>${esc(sale.cashier_name || "—")}</span></div>
    <div class="line"><span>Customer</span><span>${esc(sale.customer_name || "Walk-in")}</span></div>
    ${sale.customer_gstin ? `<div class="line"><span>Cust GSTIN</span><span>${esc(sale.customer_gstin)}</span></div>` : ""}
    <div class="sep dashed"></div>
    <table class="items">
      <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sep dashed"></div>
    ${gstRow}
    ${sale.total_discount ? `<div class="line"><span>Discount</span><span>- ${amt(sale.total_discount)}</span></div>` : ""}
    <div class="line grand"><span>TOTAL</span><span>${inr(sale.grand_total)}</span></div>
    <div class="sep"></div>
    ${payments}
    <div class="line balance"><span>BALANCE</span><span>${inr(balance)}</span></div>
    <div class="sep dashed"></div>
    <div class="center thanks">Thank You For Shopping!</div>
    <div class="center muted">Please Visit Again</div>
    ${business.invoice_footer ? `<div class="center muted">${esc(business.invoice_footer)}</div>` : ""}
    ${business.show_branding ? `<div class="center brand">Powered by BillNova</div>` : ""}
  </div>`;
}

/** Stylesheet shared by the printed receipt and the side-panel preview. */
export const RECEIPT_CSS = `
  .receipt { font-family: "Courier New", monospace; color: #000; background: #fff; padding: 8px 10px; }
  .receipt.w80 { width: 302px; font-size: 12px; }
  .receipt.w58 { width: 219px; font-size: 11px; }
  .receipt .center { text-align: center; }
  .receipt .bold { font-weight: 700; }
  .receipt .biz { font-size: 14px; letter-spacing: .5px; }
  .receipt .muted { color: #333; font-size: 10px; }
  .receipt .sep { border-top: 1px solid #000; margin: 6px 0; }
  .receipt .sep.dashed { border-top: 1px dashed #000; }
  .receipt table.items { width: 100%; border-collapse: collapse; }
  .receipt table.items th { text-align: left; font-weight: 700; border-bottom: 1px dashed #000; padding: 2px 0; }
  .receipt table.items td { padding: 2px 0; vertical-align: top; }
  .receipt table.items td.iname { padding-right: 6px; word-break: break-word; }
  .receipt .r { text-align: right; white-space: nowrap; }
  .receipt .line { display: flex; justify-content: space-between; gap: 8px; }
  .receipt .grand { font-weight: 700; font-size: 14px; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
  .receipt .balance { font-weight: 600; }
  .receipt .thanks { margin-top: 6px; font-weight: 700; }
  .receipt .brand { margin-top: 6px; color: #888; font-size: 9px; }
  .receipt .void { text-align: center; font-weight: 700; color: #b00; border: 1px solid #b00; padding: 2px; margin-bottom: 6px; }
`;

/** Print HTML through a hidden iframe — no new tab, no preview page. The OS print dialog
 *  opens (or prints silently if the browser/kiosk is configured for a default printer). */
function printViaIframe(innerHtml: string, pageCss: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>${pageCss}${RECEIPT_CSS}</style></head>` +
      `<body onload="window.focus();window.print();">${innerHtml}</body></html>`,
  );
  doc.close();
  // Clean up after the dialog has had time to read the document.
  window.setTimeout(() => iframe.remove(), 60_000);
}

/** Direct thermal print (80mm/58mm). Used by the POS "Save & Print" fast path. */
export function printThermal(invoice: Invoice, widthMm: 80 | 58 = 80) {
  const pageCss = `@page { size: ${widthMm}mm auto; margin: 0; } body { margin: 0; }`;
  printViaIframe(receiptInnerHTML(invoice, widthMm), pageCss);
}

/** Open a PDF blob (A4 invoice) in a new tab for preview/print. */
export function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Print/preview an invoice according to the tenant's configured format.
 * - thermal_80 / thermal_58 → direct thermal print (no preview tab).
 * - a4 → fetch the server-rendered A4 PDF and open the preview.
 */
export async function printInvoiceByType(invoice: Invoice, type: InvoiceType) {
  if (type === "a4") {
    const { data } = await api.get<Blob>(`/invoices/${invoice.sale.id}/pdf`, { responseType: "blob" });
    openPdfBlob(data);
    return;
  }
  printThermal(invoice, type === "thermal_58" ? 58 : 80);
}
