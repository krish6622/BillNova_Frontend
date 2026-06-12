import { motion } from "framer-motion";
import {
  Minus,
  Pause,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { GlassCard } from "@/components/ui/glass-card";
import { useProducts, useRecentProducts, useTopSellingProducts } from "@/features/products/api";
import type { Product } from "@/features/products/types";
import { fetchInvoice, useCreateSale, usePreview, useSales } from "@/features/sales/api";
import { printInvoice } from "@/features/sales/print";
import type { CreateSaleRequest, PaymentInput } from "@/features/sales/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/stores/cart";

type Mode = "Cash" | "UPI" | "Card";
const MODES: Mode[] = ["Cash", "UPI", "Card"];
const HELD_KEY = "billnova_held_bills";

interface HeldBill {
  id: string;
  lines: ReturnType<typeof useCart.getState>["lines"];
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

export default function POS() {
  const cart = useCart();
  const searchRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<PaymentInput[]>([{ mode: "Cash", amount: 0 }]);
  const [payTouched, setPayTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [held, setHeld] = useState<HeldBill[]>(loadHeld);
  const [heldOpen, setHeldOpen] = useState(false);

  const searching = search.trim().length > 0;
  const { data: products } = useProducts({ search, page: 1, limit: 60 });
  const { data: recent } = useRecentProducts(12);
  const { data: topSelling } = useTopSellingProducts(12);
  const createSale = useCreateSale();

  const previewBody = useMemo(
    () => ({
      items: cart.lines.map((l) => ({ product_id: l.productId, quantity: l.quantity, discount: l.discount })),
      bill_discount: cart.billDiscount,
    }),
    [cart.lines, cart.billDiscount],
  );
  const hasValidLines = cart.lines.length > 0 && cart.lines.every((l) => l.quantity > 0);
  const { data: preview } = usePreview(previewBody, hasValidLines);

  const grandTotal = preview?.totals.grand_total ?? 0;
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paid) * 100) / 100;

  // Auto-fill the tendered amount to the grand total (single payment, untouched) —
  // classic POS behaviour. Splitting or editing an amount opts out of auto-fill.
  useEffect(() => {
    if (!payTouched) {
      setPayments((prev) =>
        prev.length === 1 && prev[0].amount !== grandTotal
          ? [{ mode: prev[0].mode, amount: grandTotal }]
          : prev,
      );
    }
  }, [grandTotal, payTouched]);

  const save = async () => {
    setError(null);
    if (!hasValidLines) return setError("Add at least one product.");
    if (Math.abs(remaining) > 0.001) return setError("Payments must equal the grand total.");
    const body: CreateSaleRequest = {
      ...previewBody,
      notes: cart.notes || null,
      payments: payments.filter((p) => Number(p.amount) > 0),
    };
    try {
      const sale = await createSale.mutateAsync(body);
      printInvoice(await fetchInvoice(sale.id));
      cart.clear();
      setPayments([{ mode: "Cash", amount: 0 }]);
      setPayTouched(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const hold = () => {
    if (cart.lines.length === 0) return;
    const bill: HeldBill = {
      id: String(payments.length) + cart.lines.map((l) => l.productId).join("") + cart.lines.length,
      lines: cart.lines,
      billDiscount: cart.billDiscount,
      notes: cart.notes,
      ts: new Date().toLocaleString("en-IN"),
    };
    const updated = [bill, ...held].slice(0, 10);
    setHeld(updated);
    localStorage.setItem(HELD_KEY, JSON.stringify(updated));
    cart.clear();
    setPayments([{ mode: "Cash", amount: 0 }]);
    setPayTouched(false);
  };

  const restore = (b: HeldBill) => {
    cart.load(b.lines, b.billDiscount, b.notes);
    const updated = held.filter((h) => h.id !== b.id);
    setHeld(updated);
    localStorage.setItem(HELD_KEY, JSON.stringify(updated));
    setHeldOpen(false);
  };

  // Keyboard shortcuts — read latest actions via ref so the listener binds once.
  const actions = useRef({ save, hold, focusSearch: () => {}, focusPay: () => {} });
  actions.current = {
    save,
    hold,
    focusSearch: () => searchRef.current?.focus(),
    focusPay: () => {
      if (Math.abs(remaining) > 0.001) setPayments([{ mode: "Cash", amount: grandTotal }]);
      paymentRef.current?.focus();
    },
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, () => void> = {
        F2: actions.current.focusSearch,
        F4: actions.current.hold,
        F8: actions.current.focusPay,
        F10: actions.current.save,
      };
      if (map[e.key]) {
        e.preventDefault();
        map[e.key]();
      }
    };
    window.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1.25fr_1fr_360px]">
        {/* LEFT — products */}
        <GlassCard className="flex flex-col overflow-hidden p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…  (F2)"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-indigo-400/60 focus:ring-4 focus:ring-indigo-500/15"
            />
          </div>
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {searching ? (
              <ProductGrid products={products?.items ?? []} onPick={cart.addProduct}
                empty="No products found." />
            ) : (
              <div className="space-y-5">
                <Section title="Top Selling">
                  <ProductGrid products={topSelling ?? []} onPick={cart.addProduct}
                    empty="No sales yet — your bestsellers will appear here." />
                </Section>
                <Section title="Recent Products">
                  <ProductGrid products={recent ?? []} onPick={cart.addProduct}
                    empty="No products yet — add some via Purchases." />
                </Section>
              </div>
            )}
          </div>
        </GlassCard>

        {/* CENTER — cart */}
        <GlassCard className="flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-4 w-4" /> Cart</h2>
            <span className="text-xs text-muted-foreground">{cart.lines.length} item(s)</span>
          </div>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {cart.lines.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ShoppingCart className="h-8 w-8 opacity-40" />
                Tap products to add them.
              </div>
            )}
            {cart.lines.map((l) => {
              const pline = preview?.items.find((i) => i.product_id === l.productId);
              return (
                <div key={l.productId} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{formatINR(l.unitPrice)} · GST {l.gstPercentage}%</div>
                    </div>
                    <button onClick={() => cart.remove(l.productId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StepBtn onClick={() => cart.setQuantity(l.productId, l.quantity - 1)}><Minus className="h-3.5 w-3.5" /></StepBtn>
                      <input
                        value={l.quantity}
                        onChange={(e) => cart.setQuantity(l.productId, Number(e.target.value) || 0)}
                        className="h-8 w-12 rounded-lg border border-white/10 bg-white/5 text-center text-sm outline-none"
                      />
                      <StepBtn onClick={() => cart.setQuantity(l.productId, l.quantity + 1)}><Plus className="h-3.5 w-3.5" /></StepBtn>
                      <input
                        type="number"
                        value={l.discount}
                        onChange={(e) => cart.setDiscount(l.productId, Number(e.target.value) || 0)}
                        placeholder="Disc"
                        className="ml-2 h-8 w-16 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-xs outline-none"
                      />
                    </div>
                    <span className="text-sm font-semibold">{formatINR(pline?.line_total ?? 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <input
            value={cart.notes}
            onChange={(e) => cart.setNotes(e.target.value)}
            placeholder="Bill notes (optional)"
            className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </GlassCard>

        {/* RIGHT — payment */}
        <GlassCard className="flex flex-col overflow-hidden p-5">
          <h2 className="font-semibold">Payment</h2>
          <div className="mt-4 space-y-1.5 text-sm">
            <Row label="Taxable" value={preview?.totals.total_taxable ?? 0} />
            <Row label="CGST" value={preview?.totals.total_cgst ?? 0} />
            <Row label="SGST" value={preview?.totals.total_sgst ?? 0} />
            {(preview?.totals.total_igst ?? 0) > 0 && <Row label="IGST" value={preview?.totals.total_igst ?? 0} />}
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Bill Discount</span>
              <input
                type="number"
                value={cart.billDiscount}
                onChange={(e) => cart.setBillDiscount(Number(e.target.value) || 0)}
                className="h-8 w-24 rounded-lg border border-white/10 bg-white/5 px-2 text-right text-sm outline-none"
              />
            </div>
          </div>

          <div className="my-4 flex items-baseline justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-muted-foreground">Grand Total</span>
            <span className="text-2xl font-bold">{formatINR(grandTotal)}</span>
          </div>

          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={i} className="flex gap-2">
                <select
                  value={p.mode}
                  onChange={(e) => setPayments((arr) => arr.map((x, idx) => (idx === i ? { ...x, mode: e.target.value as Mode } : x)))}
                  className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-sm outline-none"
                >
                  {MODES.map((m) => <option key={m} value={m} className="bg-[#0a1330]">{m}</option>)}
                </select>
                <input
                  ref={i === 0 ? paymentRef : undefined}
                  type="number"
                  value={p.amount}
                  onChange={(e) => {
                    setPayTouched(true);
                    setPayments((arr) => arr.map((x, idx) => (idx === i ? { ...x, amount: Number(e.target.value) || 0 } : x)));
                  }}
                  className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-right text-sm outline-none"
                />
                {payments.length > 1 && (
                  <button onClick={() => setPayments((arr) => arr.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => { setPayTouched(true); setPayments((p) => [...p, { mode: "UPI", amount: 0 }]); }} className="text-indigo-400 hover:text-indigo-300">+ Split payment</button>
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
              disabled={!hasValidLines || createSale.isPending}
              onClick={save}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 disabled:opacity-60"
            >
              <Printer className="h-4 w-4" /> {createSale.isPending ? "Saving…" : "Save & Print  (F10)"}
            </motion.button>
            <div className="flex gap-2">
              <button onClick={hold} disabled={cart.lines.length === 0} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50">
                <Pause className="h-4 w-4" /> Hold
              </button>
              <button onClick={() => setConfirmClear(true)} disabled={cart.lines.length === 0} className="h-10 flex-1 rounded-xl border border-white/10 text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50">Clear</button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Footer — shortcuts */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/10 bg-white/[0.02] px-5 py-2 text-xs text-muted-foreground backdrop-blur">
        <Shortcut k="F2" label="Search" />
        <Shortcut k="F4" label="Hold Bill" />
        <Shortcut k="F8" label="Payment" />
        <Shortcut k="F10" label="Print" />
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
            <button key={b.id} onClick={() => restore(b)} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm hover:bg-white/5">
              <span>{b.lines.length} item(s) · {b.ts}</span>
              <span className="text-indigo-400">Resume</span>
            </button>
          ))}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmClear}
        title="Clear the cart?"
        description="All items and payment entries will be removed."
        confirmLabel="Clear"
        onConfirm={() => { cart.clear(); setPayTouched(false); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10">
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

function ProductGrid({ products, onPick, empty }: { products: Product[]; onPick: (p: Product) => void; empty: string }) {
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
          className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-indigo-400/40 hover:bg-white/[0.07]"
        >
          <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
          <span className="mt-1 font-mono text-[10px] text-muted-foreground">{p.product_code}</span>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-300">{formatINR(p.selling_price)}</span>
            <StockBadge stock={p.current_stock} reorder={p.reorder_level} />
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function StockBadge({ stock, reorder }: { stock: number; reorder: number }) {
  const low = reorder > 0 && stock <= reorder;
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${low ? "bg-amber-500/15 text-amber-400" : "bg-white/5 text-muted-foreground"}`}>
      {stock} in stock
    </span>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatINR(value)}</span>
    </div>
  );
}

function Shortcut({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{k}</kbd>
      {label}
    </span>
  );
}

function RecentInvoices({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useSales(1, 10);
  const reprint = async (id: string) => printInvoice(await fetchInvoice(id));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader title="Recent Invoices" description="Reprint a previous bill." />
      <div className="max-h-[50vh] space-y-1 overflow-auto">
        {data?.items.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
        {data?.items.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
            <span className="font-mono">{s.invoice_number}</span>
            <span>{formatINR(s.grand_total)}</span>
            <button onClick={() => reprint(s.id)} className="text-indigo-400 hover:text-indigo-300">Print</button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
