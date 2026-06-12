import type { Invoice } from "./types";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** Open a print-friendly invoice in a new window and trigger the print dialog. */
export function printInvoice(invoice: Invoice) {
  const { business, sale } = invoice;
  const rows = sale.items
    .map(
      (it) => `
      <tr>
        <td>${esc(it.product_name)}${it.hsn_code ? `<br><span class="muted">HSN ${esc(it.hsn_code)}</span>` : ""}</td>
        <td class="r">${it.quantity}</td>
        <td class="r">${inr(it.unit_price)}</td>
        <td class="r">${it.discount ? inr(it.discount) : "—"}</td>
        <td class="r">${inr(it.taxable_value)}</td>
        <td class="r">${it.gst_percentage}%</td>
        <td class="r">${inr(it.cgst + it.sgst + it.igst)}</td>
        <td class="r">${inr(it.line_total)}</td>
      </tr>`,
    )
    .join("");

  const payments = sale.payments.map((p) => `${esc(p.mode)}: ${inr(p.amount)}`).join(" · ");
  const date = new Date(sale.created_at).toLocaleString("en-IN");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sale.invoice_number)}</title>
  <style>
    * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
    body { margin: 24px; color: #111; font-size: 13px; }
    h1 { font-size: 20px; margin: 0; }
    .muted { color: #666; font-size: 11px; }
    .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f4f4f5; font-size: 11px; text-transform: uppercase; }
    .r { text-align: right; }
    .totals { margin-top: 16px; margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { font-weight: 700; font-size: 15px; border-top: 2px solid #111; margin-top: 6px; padding-top: 6px; }
    .foot { margin-top: 24px; }
    @media print { body { margin: 0; } }
  </style></head><body>
    <div class="head">
      <div>
        <h1>${esc(business.business_name)}</h1>
        ${business.gst_number ? `<div class="muted">GSTIN: ${esc(business.gst_number)}</div>` : ""}
        <div class="muted">${esc(business.mobile)} · ${esc(business.email)}</div>
      </div>
      <div class="r">
        <div><strong>TAX INVOICE</strong></div>
        <div class="muted">${esc(sale.invoice_number)}</div>
        <div class="muted">${esc(date)}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Disc</th>
        <th class="r">Taxable</th><th class="r">GST%</th><th class="r">GST</th><th class="r">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Taxable</span><span>${inr(sale.total_taxable)}</span></div>
      ${sale.total_cgst ? `<div><span>CGST</span><span>${inr(sale.total_cgst)}</span></div>` : ""}
      ${sale.total_sgst ? `<div><span>SGST</span><span>${inr(sale.total_sgst)}</span></div>` : ""}
      ${sale.total_igst ? `<div><span>IGST</span><span>${inr(sale.total_igst)}</span></div>` : ""}
      ${sale.total_discount ? `<div><span>Discount</span><span>- ${inr(sale.total_discount)}</span></div>` : ""}
      <div class="grand"><span>Grand Total</span><span>${inr(sale.grand_total)}</span></div>
    </div>
    <div class="foot muted">Payment — ${payments}</div>
    <script>window.onload = function(){ window.print(); }</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
