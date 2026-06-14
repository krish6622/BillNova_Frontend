/**
 * Shared client-side pricing engine — the single source of pricing formulas on the
 * frontend. It MIRRORS the backend engine exactly:
 *   - selling price:  app/services/pricing.py     (compute_selling_price)
 *   - GST / totals:   app/services/gst_service.py  (compute_bill)
 *
 * The backend remains authoritative for any PERSISTED sale (the POS posts to
 * /api/sales/preview and /api/sales and renders those numbers). These helpers exist so
 * presentational previews (Purchase Pricing Preview, live POS line hints) use the very
 * same arithmetic — no duplicated/divergent formulas anywhere.
 *
 * CR-4: the standard (default) mode is EXCLUSIVE — GST is added ON TOP of the selling
 * price, so the full markup is preserved as profit:
 *     selling = purchase + markup ;  GST = selling × rate% ;  customer = selling + GST
 * INCLUSIVE mode (GST already embedded in the selling price) is the opt-in alternative.
 */

/** Round half-up to 2 dp (mirrors Decimal ROUND_HALF_UP in the backend). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Step 1 — Selling Price = Purchase Price + Markup. */
export function sellingPrice(purchasePrice: number, markupAmount: number): number {
  return round2(purchasePrice + markupAmount);
}

/** Step 2 — GST amount on a taxable value at the given rate. */
export function gstAmount(taxableValue: number, gstPercentage: number): number {
  return round2((taxableValue * gstPercentage) / 100);
}

/** Step 3 (exclusive) — Customer Price = Selling Price + GST. */
export function customerPriceExclusive(sellingPrice: number, gstPercentage: number): number {
  return round2(sellingPrice + gstAmount(sellingPrice, gstPercentage));
}

/** Inclusive mode — GST is already embedded in the selling price. The customer pays the
 *  selling price; this returns the carved-out taxable value and GST amount. */
export function inclusiveBreakup(
  sellingPrice: number,
  gstPercentage: number,
): { taxable: number; gst: number } {
  const taxable = round2(sellingPrice / (1 + gstPercentage / 100));
  return { taxable, gst: round2(sellingPrice - taxable) };
}

/**
 * CR-6 — per-unit DISPLAY rates for invoices. Mirrors backend app/services/pricing.py.
 * A printed line must ALWAYS satisfy: quantity × displayedRate === displayedAmount.
 */
function perUnit(total: number, quantity: number): number {
  return quantity === 0 ? 0 : round2(total / quantity);
}

/** GST-HIDDEN rate: all-inclusive per-unit price the customer pays (line_total / qty). */
export function customerUnitRate(lineTotal: number, quantity: number): number {
  return perUnit(lineTotal, quantity);
}

/** GST-VISIBLE rate: per-unit taxable (pre-GST) price = selling price in exclusive mode. */
export function netUnitRate(taxableValue: number, quantity: number): number {
  return perUnit(taxableValue, quantity);
}

export interface ThermalLine {
  name: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}

/**
 * Build the per-line display rows for a thermal/printed invoice. Single source of truth for
 * both the printed receipt and the on-screen previews — guarantees qty × rate === amount.
 */
export function thermalLineItems(
  items: { product_name: string; unit: string; quantity: number; unit_price: number; taxable_value: number; line_total: number }[],
  showGst: boolean,
): ThermalLine[] {
  return items.map((it) => ({
    name: it.product_name,
    unit: it.unit,
    qty: it.quantity,
    rate: showGst ? netUnitRate(it.taxable_value, it.quantity) : customerUnitRate(it.line_total, it.quantity),
    amount: showGst ? round2(it.taxable_value) : round2(it.line_total),
  }));
}

export type GstMode = "inclusive" | "exclusive";

export interface LinePricing {
  taxable: number;
  gst: number;
  lineTotal: number;
}

/**
 * Per-line pricing for a quantity at a unit selling price — the same shape the backend
 * `compute_bill` produces per line (before bill-level discount apportionment).
 */
export function linePricing(
  unitSellingPrice: number,
  quantity: number,
  gstPercentage: number,
  mode: GstMode = "exclusive",
  discount = 0,
): LinePricing {
  const base = Math.max(0, round2(unitSellingPrice * quantity - discount));
  if (mode === "inclusive") {
    const taxable = round2(base / (1 + gstPercentage / 100));
    return { taxable, gst: round2(base - taxable), lineTotal: base };
  }
  const gst = gstAmount(base, gstPercentage);
  return { taxable: base, gst, lineTotal: round2(base + gst) };
}

// --- CR-7: full client-side bill engine (mirrors backend gst_service.compute_bill) -------
// Lets the POS compute every total LOCALLY — no API round-trip during cart edits. Pricing
// is always exclusive (the CR-4 standard). The backend recomputes authoritatively on save;
// these figures must match it exactly, so each step rounds half-up to 2dp like the server.

export interface BillLineInput {
  unitPrice: number;
  quantity: number;
  gstPercentage: number;
  discount?: number;
}

export interface BillLine {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  discount: number;
  lineTotal: number;
}

export interface BillTotals {
  taxable: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gst: number;
  grandTotal: number;
}

export function computeBill(
  lines: BillLineInput[],
  billDiscount = 0,
  placeOfSupply: "intra" | "inter" = "intra",
  chargeGst = true,
): { lines: BillLine[]; totals: BillTotals } {
  const grosses = lines.map((l) => round2(l.unitPrice * l.quantity));
  const totalGross = grosses.reduce((s, g) => s + g, 0);

  const out: BillLine[] = [];
  const totals: BillTotals = { taxable: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, grandTotal: 0 };

  lines.forEach((l, i) => {
    const gross = grosses[i];
    const share = totalGross > 0 && billDiscount > 0 ? billDiscount * (gross / totalGross) : 0;
    const effDisc = round2((l.discount ?? 0) + share);
    const base = Math.max(0, round2(gross - effDisc));

    // WITHOUT_GST (chargeGst=false): no tax is added — taxable == lineTotal == base.
    const gst = chargeGst ? round2((base * l.gstPercentage) / 100) : 0;
    const taxable = base;
    const lineTotal = round2(base + gst);

    let cgst = 0, sgst = 0, igst = 0;
    if (placeOfSupply === "inter") {
      igst = gst;
    } else {
      cgst = round2(gst / 2);
      sgst = round2(gst - cgst); // keep cgst + sgst == gst exactly
    }

    out.push({ taxable, cgst, sgst, igst, gst, discount: effDisc, lineTotal });
    totals.taxable = round2(totals.taxable + taxable);
    totals.discount = round2(totals.discount + effDisc);
    totals.cgst = round2(totals.cgst + cgst);
    totals.sgst = round2(totals.sgst + sgst);
    totals.igst = round2(totals.igst + igst);
    totals.gst = round2(totals.gst + gst);
    totals.grandTotal = round2(totals.grandTotal + lineTotal);
  });

  return { lines: out, totals };
}
