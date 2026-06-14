import { motion } from "framer-motion";
import { Minus, Pause, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { useProducts, useRecentProducts, useTopSellingProducts } from "@/features/products/api";
import type { Product } from "@/features/products/types";
import { fetchInvoice, useCreateSale, useSales } from "@/features/sales/api";
import { printInvoiceByType } from "@/features/sales/print";
import type { CreateSaleRequest } from "@/features/sales/types";
import { useSettings } from "@/features/settings/api";
import { getApiErrorMessage } from "@/lib/api";
import { isValidGstin, normalizeGstin } from "@/lib/gstin";
import { type BillTotals, computeBill } from "@/lib/pricing";
import { perf, perfStart } from "@/lib/perf";
import { formatINR } from "@/lib/utils";
import { type CartLine, useCart } from "@/stores/cart";
import { type PaymentMode, useCheckout } from "@/stores/checkout";

const MODES: PaymentMode[] = ["Cash", "UPI", "Card"];
const HELD_KEY = "billnova_held_bills";

interface HeldBill {
  id: string;
  lines: CartLine[];
  billDiscount: number;
  notes: string;
  ts: string;
}

function loadHeld(): HeldBill[] {
  try {
    return JSON.parse(localStorage.getItem(HELD_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Local, memoized bill computation from cart slices — no API call (CR-7 perf).
 *  WITHOUT_GST bills compute with GST forced to 0 (mirrors the backend). */
function useBill(): { lines: ReturnType<typeof computeBill>["lines"]; totals: BillTotals } {
  const lines = useCart((s) => s.lines);
  const billDiscount = useCart((s) => s.billDiscount);
  const chargeGst = useCheckout((s) => s.billingType === "WITH_GST");
  return useMemo(
    () =>
      perf("cart-calc", () =>
        computeBill(
          lines.map((l) => ({
            unitPrice: l.unitPrice, quantity: l.quantity, gstPercentage: l.gstPercentage, discount: l.discount,
          })),
          billDiscount,
          "intra",
          chargeGst,
        ),
      ),
    [lines, billDiscount, chargeGst],
  );
}

export default function POS() {
  const searchRef = useRef<HTMLInputElement>(null);
  const createSale = useCreateSale();
  const { data: settings } = useSettings();
  const [held, setHeld] = useState<HeldBill[]>(loadHeld);
  const [recentOpen, setRecentOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);

  const save = useCallback(async () => {
    const { setError } = useCheckout.getState();
    setError(null);
    const { lines, billDiscount } = useCart.getState();
    const { payments, customer, customerMobile, customerGstin, isGstCustomer, billingType, notes, showGst } =
      useCheckout.getState();
    if (lines.length === 0 || lines.some((l) => l.quantity <= 0)) return setError("Add at least one product.");

    // GST customer (B2B) requires a name and a valid GSTIN.
    if (isGstCustomer) {
      if (!customer.trim()) return setError("Customer name is required for a GST customer.");
      if (!isValidGstin(customerGstin)) return setError("Enter a valid 15-character GSTIN.");
    }

    const withGst = billingType === "WITH_GST";
    const { totals } = computeBill(
      lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, gstPercentage: l.gstPercentage, discount: l.discount })),
      billDiscount,
      "intra",
      withGst,
    );
    const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (Math.abs(totals.grandTotal - paid) > 0.001) return setError("Payments must equal the grand total.");

    const body: CreateSaleRequest = {
      items: lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, discount: l.discount })),
      bill_discount: billDiscount,
      billing_type: billingType,
      notes: notes || null,
      customer_name: customer.trim() || null,
      is_gst_customer: isGstCustomer,
      customer_mobile: isGstCustomer ? customerMobile.trim() || null : null,
      customer_gstin: isGstCustomer ? normalizeGstin(customerGstin) : null,
      // GST display only applies to a WITH_GST bill; a non-GST bill has nothing to show.
      show_gst_on_invoice: withGst && showGst,
      payments: payments.filter((p) => Number(p.amount) > 0),
    };
    try {
      const end = perfStart("invoice-save");
      const sale = await createSale.mutateAsync(body);
      end();
      try {
        await printInvoiceByType(await fetchInvoice(sale.id), settings?.invoice_type ?? "thermal_80");
      } catch {
        /* printer hiccup — sale is saved and in the register */
      }
      useCart.getState().clear();
      useCheckout.getState().reset();
      searchRef.current?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [createSale, settings]);

  const hold = useCallback(() => {
    const { lines, billDiscount } = useCart.getState();
    const { notes } = useCheckout.getState();
    if (lines.length === 0) return;
    const bill: HeldBill = {
      id: String(Date.now()) + lines.length,
      lines, billDiscount, notes, ts: new Date().toLocaleString("en-IN"),
    };
    setHeld((prev) => {
      const updated = [bill, ...prev].slice(0, 10);
      localStorage.setItem(HELD_KEY, JSON.stringify(updated));
      return updated;
    });
    useCart.getState().clear();
    useCheckout.getState().reset();
  }, []);

  const restore = (b: HeldBill) => {
    useCart.getState().load(b.lines, b.billDiscount);
    useCheckout.getState().setNotes(b.notes);
    setHeld((prev) => {
      const updated = prev.filter((h) => h.id !== b.id);
      localStorage.setItem(HELD_KEY, JSON.stringify(updated));
      return updated;
    });
    setHeldOpen(false);
  };

  // F10 save / F4 hold (F2 search & F8 payment are handled inside their panels).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F10") { e.preventDefault(); save(); }
      else if (e.key === "F4") { e.preventDefault(); hold(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, hold]);

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1.25fr_1fr_360px]">
        <ProductPanel searchRef={searchRef} />
        <CartPanel />
        <PaymentPanel save={save} hold={hold} saving={createSale.isPending} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-white/[0.02] px-5 py-2 text-xs text-muted-foreground backdrop-blur">
        <Shortcut k="F2" label="Search" />
        <Shortcut k="F4" label="Hold Bill" />
        <Shortcut k="F8" label="Payment" />
        <Shortcut k="F9" label="Invoices" />
        <Shortcut k="F10" label="Save & Print" />
        <div className="ml-auto flex items-center gap-4">
          {held.length > 0 && (
            <button onClick={() => setHeldOpen(true)} className="font-medium text-amber-400 hover:text-amber-300">Held bills ({held.length})</button>
          )}
          <button onClick={() => setRecentOpen(true)} className="font-medium text-indigo-400 hover:text-indigo-300">Reprint</button>
        </div>
      </div>

      <RecentInvoices open={recentOpen} onClose={() => setRecentOpen(false)} />
      <Dialog open={heldOpen} onOpenChange={(o) => !o && setHeldOpen(false)}>
        <DialogHeader title="Held Bills" description="Resume a parked bill." />
        <div className="max-h-[50vh] space-y-2 overflow-auto">
          {held.length === 0 && <p className="text-sm text-muted-foreground">No held bills.</p>}
          {held.map((b) => (
            <button key={b.id} onClick={() => restore(b)} className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm hover:bg-white/5">
              <span>{b.lines.length} item(s) · {b.ts}</span>
              <span className="text-indigo-400">Resume</span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

/* ─────────────── PRODUCT PANEL (does not re-render on cart/payment changes) ─────────── */

const ProductPanel = memo(function ProductPanel({ searchRef }: { searchRef: React.RefObject<HTMLInputElement> }) {
  const addProduct = useCart((s) => s.addProduct); // stable action — no re-render on line changes
  const [search, setSearch] = useState("");
  const searching = search.trim().length > 0;
  const { data: products } = useProducts({ search, page: 1, limit: 60 });
  const { data: recent } = useRecentProducts(12);
  const { data: topSelling } = useTopSellingProducts(12);

  const add = useCallback((p: Product) => perf("add-to-cart", () => addProduct(p)), [addProduct]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [searchRef]);

  return (
    <GlassCard className="flex flex-col overflow-hidden p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…  (F2)"
          className="h-11 w-full rounded-xl border border-border bg-white/5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
        />
      </div>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {searching ? (
          <ProductGrid products={products?.items ?? []} onPick={add} empty="No products found." />
        ) : (
          <div className="space-y-5">
            <Section title="Top Selling">
              <ProductGrid products={topSelling ?? []} onPick={add} empty="No sales yet — your bestsellers will appear here." />
            </Section>
            <Section title="Recent Products">
              <ProductGrid products={recent ?? []} onPick={add} empty="No products yet — add some via Purchases." />
            </Section>
          </div>
        )}
      </div>
    </GlassCard>
  );
});

/* ─────────────── CART PANEL (re-renders on line changes, not on payment) ────────────── */

const CartPanel = memo(function CartPanel() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const setDiscount = useCart((s) => s.setDiscount);
  const remove = useCart((s) => s.remove);
  const customer = useCheckout((s) => s.customer);
  const setCustomer = useCheckout((s) => s.setCustomer);
  const customerMobile = useCheckout((s) => s.customerMobile);
  const setCustomerMobile = useCheckout((s) => s.setCustomerMobile);
  const customerGstin = useCheckout((s) => s.customerGstin);
  const setCustomerGstin = useCheckout((s) => s.setCustomerGstin);
  const isGstCustomer = useCheckout((s) => s.isGstCustomer);
  const setIsGstCustomer = useCheckout((s) => s.setIsGstCustomer);
  const notes = useCheckout((s) => s.notes);
  const setNotes = useCheckout((s) => s.setNotes);
  const { lines: computed } = useBill();
  const gstinValid = !isGstCustomer || isValidGstin(customerGstin);

  return (
    <GlassCard className="flex flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Cart</h2>
        <span className="text-xs text-muted-foreground">{lines.length} item(s)</span>
      </div>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {lines.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShoppingCart className="h-8 w-8 opacity-40" />
            Tap products to add them.
          </div>
        )}
        {lines.map((l, i) => {
          const c = computed[i];
          return (
            <div key={l.productId} className="rounded-xl border border-border bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{l.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">Rate {formatINR(l.unitPrice)} · GST {l.gstPercentage}%</div>
                </div>
                <button onClick={() => remove(l.productId)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <StepBtn onClick={() => setQuantity(l.productId, l.quantity - 1)}><Minus className="h-3.5 w-3.5" /></StepBtn>
                  <input
                    value={l.quantity}
                    onChange={(e) => setQuantity(l.productId, Number(e.target.value) || 0)}
                    className="h-8 w-12 rounded-lg border border-border bg-white/5 text-center text-sm outline-none"
                  />
                  <StepBtn onClick={() => setQuantity(l.productId, l.quantity + 1)}><Plus className="h-3.5 w-3.5" /></StepBtn>
                  <input
                    type="number"
                    value={l.discount}
                    onChange={(e) => setDiscount(l.productId, Number(e.target.value) || 0)}
                    placeholder="Disc"
                    className="ml-2 h-8 w-16 rounded-lg border border-border bg-white/5 px-2 text-center text-xs outline-none"
                  />
                </div>
                <span className="text-sm font-semibold">{formatINR(c?.lineTotal ?? 0)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-border/60 pt-1.5 font-mono text-[10px] text-muted-foreground">
                <span>{l.quantity} × {formatINR(l.unitPrice)} = {formatINR(c?.taxable ?? 0)}</span>
                <span>+ GST {formatINR(c?.gst ?? 0)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Customer Type — Regular (walk-in) vs GST customer (B2B, GSTIN mandatory). */}
      <div className="mt-3 rounded-xl border border-border bg-white/[0.03] p-2.5">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Customer Type</div>
        <div className="flex gap-2">
          <GstChoice label="Regular" active={!isGstCustomer} onClick={() => setIsGstCustomer(false)} />
          <GstChoice label="GST Customer" active={isGstCustomer} onClick={() => setIsGstCustomer(true)} />
        </div>
      </div>
      <input
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
        placeholder={isGstCustomer ? "Customer name (required)" : "Customer name (optional)"}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-white/5 px-3 text-sm outline-none placeholder:text-muted-foreground/60"
      />
      {isGstCustomer && (
        <>
          <input
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            placeholder="Mobile number (optional)"
            className="mt-2 h-10 w-full rounded-xl border border-border bg-white/5 px-3 text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <input
            value={customerGstin}
            onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
            placeholder="GST Number (e.g. 33ABCDE1234F1Z5)"
            maxLength={15}
            className={`mt-2 h-10 w-full rounded-xl border bg-white/5 px-3 text-sm uppercase outline-none placeholder:text-muted-foreground/60 ${
              gstinValid ? "border-border" : "border-destructive/60"
            }`}
          />
          {!gstinValid && customerGstin.length > 0 && (
            <p className="mt-1 text-[11px] text-destructive">Invalid GSTIN — 15 chars, e.g. 33ABCDE1234F1Z5.</p>
          )}
        </>
      )}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Bill notes (optional)"
        className="mt-2 h-10 w-full rounded-xl border border-border bg-white/5 px-3 text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </GlassCard>
  );
});

/* ─────────────── PAYMENT PANEL (re-renders on totals/payment, not on product grid) ──── */

const PaymentPanel = memo(function PaymentPanel({ save, hold, saving }: { save: () => void; hold: () => void; saving: boolean }) {
  const lineCount = useCart((s) => s.lines.length);
  const billDiscount = useCart((s) => s.billDiscount);
  const setBillDiscount = useCart((s) => s.setBillDiscount);
  const { totals } = useBill();
  const payments = useCheckout((s) => s.payments);
  const setPayments = useCheckout((s) => s.setPayments);
  const payTouched = useCheckout((s) => s.payTouched);
  const setPayTouched = useCheckout((s) => s.setPayTouched);
  const showGst = useCheckout((s) => s.showGst);
  const setShowGst = useCheckout((s) => s.setShowGst);
  const billingType = useCheckout((s) => s.billingType);
  const setBillingType = useCheckout((s) => s.setBillingType);
  const withGst = billingType === "WITH_GST";
  const error = useCheckout((s) => s.error);
  const paymentRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const grandTotal = totals.grandTotal;
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paid) * 100) / 100;

  // Auto-fill the tendered amount to the grand total (single, untouched payment).
  useEffect(() => {
    if (!payTouched) {
      const cur = useCheckout.getState().payments;
      if (cur.length === 1 && cur[0].amount !== grandTotal) {
        setPayments([{ mode: cur[0].mode, amount: grandTotal }]);
      }
    }
  }, [grandTotal, payTouched, setPayments]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        if (Math.abs(remaining) > 0.001) { setPayTouched(false); setPayments([{ mode: "Cash", amount: grandTotal }]); }
        paymentRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remaining, grandTotal, setPayments, setPayTouched]);

  return (
    <GlassCard className="flex flex-col overflow-hidden p-5">
      <h2 className="font-semibold">Payment</h2>

      {/* Billing Type — applies to THIS invoice only (default Without GST). */}
      <div className="mt-3 rounded-xl border border-border bg-white/[0.03] p-2.5">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Billing Type</div>
        <div className="flex gap-2">
          <GstChoice label="With GST" active={withGst} onClick={() => setBillingType("WITH_GST")} />
          <GstChoice label="Without GST" active={!withGst} onClick={() => setBillingType("WITHOUT_GST")} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <Row label="Subtotal" value={totals.taxable} />
        {withGst && (
          <>
            <Row label="GST" value={totals.gst} />
            <div className="pl-3 text-xs">
              <Row label="CGST" value={totals.cgst} muted />
              <Row label="SGST" value={totals.sgst} muted />
              {totals.igst > 0 && <Row label="IGST" value={totals.igst} muted />}
            </div>
          </>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-muted-foreground">Bill Discount</span>
          <input
            type="number"
            value={billDiscount}
            onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
            className="h-8 w-24 rounded-lg border border-border bg-white/5 px-2 text-right text-sm outline-none"
          />
        </div>
      </div>

      {/* CR-7: per-bill GST display (default Hide) — only relevant for a WITH_GST bill. */}
      {withGst && (
        <div className="mt-3 rounded-xl border border-border bg-white/[0.03] p-2.5">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Invoice GST Display</div>
          <div className="flex gap-2">
            <GstChoice label="Hide GST" active={!showGst} onClick={() => setShowGst(false)} />
            <GstChoice label="Show GST" active={showGst} onClick={() => setShowGst(true)} />
          </div>
        </div>
      )}

      <div className="my-4 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">Grand Total</span>
        <span className="text-2xl font-bold">{formatINR(grandTotal)}</span>
      </div>

      <div className="space-y-2">
        {payments.map((p, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={p.mode}
              onChange={(e) => setPayments(payments.map((x, idx) => (idx === i ? { ...x, mode: e.target.value as PaymentMode } : x)))}
              className="h-10 rounded-lg border border-border bg-white/5 px-2 text-sm outline-none"
            >
              {MODES.map((m) => <option key={m} value={m} className="bg-popover text-popover-foreground">{m}</option>)}
            </select>
            <input
              ref={i === 0 ? paymentRef : undefined}
              type="number"
              value={p.amount}
              onChange={(e) => {
                setPayTouched(true);
                setPayments(payments.map((x, idx) => (idx === i ? { ...x, amount: Number(e.target.value) || 0 } : x)));
              }}
              className="h-10 flex-1 rounded-lg border border-border bg-white/5 px-3 text-right text-sm outline-none"
            />
            {payments.length > 1 && (
              <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between text-xs">
          <button onClick={() => { setPayTouched(true); setPayments([...payments, { mode: "UPI", amount: 0 }]); }} className="text-indigo-400 hover:text-indigo-300">+ Split payment</button>
          <button onClick={() => { setPayTouched(false); setPayments([{ mode: "Cash", amount: grandTotal }]); }} className="text-muted-foreground hover:text-foreground">Full cash</button>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Remaining</span>
          <span className={Math.abs(remaining) > 0.001 ? "font-semibold text-amber-400" : "font-semibold text-emerald-400"}>{formatINR(remaining)}</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-auto space-y-2 pt-4">
        <motion.button
          whileTap={{ scale: 0.99 }}
          disabled={lineCount === 0 || saving}
          onClick={save}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 disabled:opacity-60"
        >
          <Printer className="h-4 w-4" /> {saving ? "Saving…" : "Save & Print  (F10)"}
        </motion.button>
        <div className="flex gap-2">
          <button onClick={hold} disabled={lineCount === 0} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50">
            <Pause className="h-4 w-4" /> Hold
          </button>
          <button onClick={() => setConfirmClear(true)} disabled={lineCount === 0} className="h-10 flex-1 rounded-xl border border-border text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50">Clear</button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the cart?"
        description="All items and payment entries will be removed."
        confirmLabel="Clear"
        onConfirm={() => { useCart.getState().clear(); useCheckout.getState().reset(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </GlassCard>
  );
});

/* ─────────────── shared bits ─────────────── */

function GstChoice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-300" : "border-border text-muted-foreground hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white/5 text-muted-foreground hover:bg-white/10">
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

const ProductGrid = memo(function ProductGrid({ products, onPick, empty }: { products: Product[]; onPick: (p: Product) => void; empty: string }) {
  if (products.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="grid grid-cols-2 content-start gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <motion.button
          key={p.id}
          whileTap={{ scale: 0.96 }}
          onClick={() => onPick(p)}
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white/[0.03] p-3 text-left transition-colors hover:border-indigo-400/40 hover:bg-white/[0.07]"
        >
          <span className="line-clamp-2 break-words text-sm font-medium">{p.name}</span>
          <span className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{p.product_code}</span>
          <span className="mt-2 truncate text-sm font-semibold text-indigo-300">{formatINR(p.selling_price)}</span>
          <StockBadge stock={p.current_stock} reorder={p.reorder_level} />
        </motion.button>
      ))}
    </div>
  );
});

function StockBadge({ stock, reorder }: { stock: number; reorder: number }) {
  const low = reorder > 0 && stock <= reorder;
  return (
    <span className={`mt-1.5 max-w-full self-start truncate whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${low ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-muted-foreground"}`}>
      {stock} in stock
    </span>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{formatINR(value)}</span>
    </div>
  );
}

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd>
      {label}
    </span>
  );
}

function RecentInvoices({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useSales(1, 10);
  const { data: settings } = useSettings();
  const reprint = async (id: string) =>
    printInvoiceByType(await fetchInvoice(id), settings?.invoice_type ?? "thermal_80");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader title="Recent Invoices" description="Reprint a previous bill." />
      <div className="max-h-[50vh] space-y-1 overflow-auto">
        {data?.items.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
        {data?.items.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span className="font-mono">{s.invoice_number}</span>
            <span>{formatINR(s.grand_total)}</span>
            <button onClick={() => reprint(s.id)} className="text-indigo-400 hover:text-indigo-300">Print</button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
