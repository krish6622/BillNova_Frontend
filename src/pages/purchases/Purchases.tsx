import { useEffect, useState } from "react";

import { Async } from "@/components/common/Async";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useNextProductCode, useProducts } from "@/features/products/api";
import { customerPriceExclusive, previewSellingPrice } from "@/features/products/types";
import { useCancelPurchase, useCreatePurchase, usePurchases } from "@/features/purchases/api";
import type { PurchaseCreate } from "@/features/purchases/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LIMIT = 15;
const GST_RATES = [0, 5, 12, 18, 28];
const round2 = (n: number) => Math.round(n * 100) / 100;
let lineSeq = 0;

type ItemMode = "existing" | "new";

interface Line {
  key: number;
  mode: ItemMode;
  productId?: string;
  productCode: string;
  productName: string;
  hsn: string;
  gstPercentage: number;
  purchasePrice: number;
  markupAmount: number;
  quantity: number;
}

function bumpCode(code: string, by: number): string {
  const m = code.match(/^(.*?)(\d+)$/);
  if (!m) return by === 0 ? code : "";
  return m[1] + String(Number(m[2]) + by).padStart(m[2].length, "0");
}

function newLine(mode: ItemMode = "existing"): Line {
  return {
    key: ++lineSeq, mode, productCode: "", productName: "", hsn: "",
    gstPercentage: 0, purchasePrice: 0, markupAmount: 0, quantity: 1,
  };
}

export default function Purchases() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePurchases(page, LIMIT);
  const cancel = useCancelPurchase();
  const [formOpen, setFormOpen] = useState(false);
  const [toCancel, setToCancel] = useState<string | null>(null);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">Record supplier invoices — mix existing &amp; new products in one bill.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New Purchase</Button>
      </div>

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Supplier</TH><TH>Invoice #</TH><TH className="text-right">Total</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR>
            </THead>
            <TBody>
              {data?.items.map((p) => (
                <TR key={p.id}>
                  <TD>{p.purchase_date}</TD>
                  <TD className="font-medium">{p.supplier_name}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{p.invoice_number || "—"}</TD>
                  <TD className="text-right">{formatINR(p.total_amount)}</TD>
                  <TD><span className={p.status === "cancelled" ? "text-destructive" : "text-emerald-400"}>{p.status}</span></TD>
                  <TD className="text-right">
                    {p.status === "active" && <Button variant="destructive" size="sm" onClick={() => setToCancel(p.id)}>Cancel</Button>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </Async>

      {formOpen && <PurchaseDialog onClose={() => setFormOpen(false)} />}
      <ConfirmDialog
        open={!!toCancel}
        title="Cancel this purchase?"
        description="Stock added by this purchase will be reversed."
        confirmLabel="Cancel Purchase"
        pending={cancel.isPending}
        onConfirm={() => { if (toCancel) cancel.mutate(toCancel, { onSuccess: () => setToCancel(null) }); }}
        onCancel={() => setToCancel(null)}
      />
    </div>
  );
}

function PurchaseDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePurchase();
  const today = new Date().toISOString().slice(0, 10);
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine("existing")]);
  const [error, setError] = useState<string | null>(null);
  const { data: nextCode } = useNextProductCode();

  // Prefill predicted auto codes for NEW lines (overridable).
  useEffect(() => {
    if (!nextCode) return;
    setLines((ls) => {
      let seen = 0;
      return ls.map((l) => {
        if (l.mode !== "new") return l;
        const code = l.productCode || bumpCode(nextCode, seen);
        seen += 1;
        return { ...l, productCode: code };
      });
    });
  }, [nextCode]);

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const removeLine = (key: number) => setLines((ls) => (ls.length === 1 ? ls : ls.filter((l) => l.key !== key)));
  const addItem = () => setLines((ls) => [...ls, newLine("existing")]);

  // Switch an item's mode, resetting product-identity fields so the two never blur.
  const setMode = (key: number, mode: ItemMode) =>
    patch(key, {
      mode, productId: undefined, productCode: mode === "new" && nextCode ? bumpCode(nextCode, 0) : "",
      productName: "", hsn: "", gstPercentage: 0, purchasePrice: 0, markupAmount: 0,
    });

  // Purchase summary (supplier side) — purchase_price only.
  const purchaseTotal = round2(lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0));
  const purchaseGst = round2(lines.reduce((s, l) => s + round2((l.quantity * l.purchasePrice * l.gstPercentage) / 100), 0));
  const supplierPayable = round2(purchaseTotal + purchaseGst);

  const submit = async () => {
    setError(null);
    if (!supplier.trim()) return setError("Supplier name is required.");
    if (lines.length === 0) return setError("Add at least one item.");
    for (const l of lines) {
      if (l.mode === "existing" && !l.productId) return setError("Pick a product for each existing-product item.");
      if (l.mode === "new" && !l.productName.trim()) return setError("New products need a name.");
      if (l.purchasePrice <= 0) return setError("Purchase price must be greater than zero.");
      if (l.quantity <= 0) return setError("Quantity must be greater than zero.");
    }
    const body: PurchaseCreate = {
      supplier_name: supplier,
      invoice_number: invoiceNo.trim() || null,
      notes: notes.trim() || null,
      purchase_date: date,
      items: lines.map((l) => ({
        product_id: l.mode === "existing" ? l.productId : null,
        product_code: l.mode === "new" ? (l.productCode || null) : null,
        product_name: l.mode === "new" ? l.productName : null,
        hsn_code: l.hsn || null,
        gst_percentage: l.gstPercentage,
        unit: "NOS",
        purchase_price: l.purchasePrice,
        markup_amount: l.markupAmount,
        quantity: l.quantity,
      })),
    };
    try {
      await create.mutateAsync(body);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={onClose} className="max-w-3xl">
      <DialogHeader title="New Purchase" description="One supplier invoice can contain multiple products." />
      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Supplier"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" /></Field>
          <Field label="Invoice Number"><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Supplier bill no." /></Field>
          <Field label="Purchase Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
        </div>

        {/* Items */}
        <div className="max-h-[46vh] space-y-2 overflow-auto pr-1">
          {lines.map((l, idx) => (
            <ItemSection
              key={l.key}
              line={l}
              index={idx}
              canRemove={lines.length > 1}
              onPatch={(p) => patch(l.key, p)}
              onSetMode={(m) => setMode(l.key, m)}
              onRemove={() => removeLine(l.key)}
            />
          ))}
        </div>
        <Button variant="outline" onClick={addItem} className="w-full">+ Add Another Item</Button>

        {/* Summary */}
        <div className="rounded-xl border border-border bg-white/[0.03] p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Purchase Summary (Supplier)</div>
          <div className="flex justify-between py-0.5 text-sm"><span className="text-muted-foreground">Purchase Total</span><span>{formatINR(purchaseTotal)}</span></div>
          <div className="flex justify-between py-0.5 text-sm"><span className="text-muted-foreground">Purchase GST</span><span>{formatINR(purchaseGst)}</span></div>
          <div className="flex justify-between py-0.5 text-sm"><span className="text-muted-foreground">Total Items</span><span>{lines.length}</span></div>
          <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-semibold"><span>Supplier Payable</span><span>{formatINR(supplierPayable)}</span></div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={create.isPending} onClick={submit}>{create.isPending ? "Saving…" : "Save Purchase"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

function ItemSection({
  line, index, canRemove, onPatch, onSetMode, onRemove,
}: {
  line: Line; index: number; canRemove: boolean;
  onPatch: (p: Partial<Line>) => void; onSetMode: (m: ItemMode) => void; onRemove: () => void;
}) {
  const selling = previewSellingPrice(line.purchasePrice, line.markupAmount);
  const customer = customerPriceExclusive(selling, line.gstPercentage);

  return (
    <div className="rounded-xl border border-border bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Item {index + 1}</span>
        {canRemove && <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">✕</button>}
      </div>

      {/* Product type selector */}
      <div className="mb-2 flex gap-2">
        <ModeRadio label="Existing Product" active={line.mode === "existing"} onClick={() => onSetMode("existing")} />
        <ModeRadio label="New Product" active={line.mode === "new"} onClick={() => onSetMode("new")} />
      </div>

      {line.mode === "existing" ? (
        <ExistingProductFields line={line} onPatch={onPatch} />
      ) : (
        <NewProductFields line={line} onPatch={onPatch} />
      )}

      <div className="mt-2 rounded-lg border border-dashed border-border bg-white/[0.02] p-2 text-[11px]">
        <div className="flex justify-between"><span className="text-muted-foreground">Selling Price</span><span className="font-medium">{formatINR(selling)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Customer Price (incl. GST)</span><span className="font-medium">{formatINR(customer)}</span></div>
      </div>
    </div>
  );
}

function PricingInputs({ line, onPatch }: { line: Line; onPatch: (p: Partial<Line>) => void }) {
  const selling = previewSellingPrice(line.purchasePrice, line.markupAmount);
  return (
    <>
      <MiniField label="GST %">
        <select value={line.gstPercentage} onChange={(e) => onPatch({ gstPercentage: Number(e.target.value) })}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
          {GST_RATES.map((r) => <option key={r} value={r} className="bg-popover text-popover-foreground">{r}%</option>)}
        </select>
      </MiniField>
      <MiniField label="Purchase ₹"><Input type="number" value={line.purchasePrice} onChange={(e) => onPatch({ purchasePrice: Number(e.target.value) })} className="h-9" /></MiniField>
      <MiniField label="Markup ₹"><Input type="number" value={line.markupAmount} onChange={(e) => onPatch({ markupAmount: Number(e.target.value) })} className="h-9" /></MiniField>
      <MiniField label="Selling ₹"><Input value={selling.toFixed(2)} readOnly className="h-9 opacity-70" /></MiniField>
      <MiniField label="Qty (NOS)"><Input type="number" value={line.quantity} onChange={(e) => onPatch({ quantity: Number(e.target.value) })} className="h-9" /></MiniField>
    </>
  );
}

function ExistingProductFields({ line, onPatch }: { line: Line; onPatch: (p: Partial<Line>) => void }) {
  const [search, setSearch] = useState("");
  const { data: products } = useProducts({ search, page: 1, limit: 6 });
  const pick = (p: { id: string; product_code: string; name: string; purchase_price: number; gst_percentage: number; markup_amount: number; hsn_code: string | null }) => {
    onPatch({
      productId: p.id, productCode: p.product_code, productName: p.name, hsn: p.hsn_code ?? "",
      gstPercentage: p.gst_percentage, purchasePrice: p.purchase_price, markupAmount: p.markup_amount,
    });
    setSearch("");
  };
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="relative col-span-2 sm:col-span-4">
        {line.productId ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-white/5 px-3 py-2 text-sm">
            <span>{line.productName} <span className="font-mono text-xs text-muted-foreground">({line.productCode})</span></span>
            <button onClick={() => onPatch({ productId: undefined, productName: "" })} className="text-xs text-indigo-400 hover:text-indigo-300">change</button>
          </div>
        ) : (
          <>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search existing product…" className="h-9" />
            {search && products && products.items.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                {products.items.map((p) => (
                  <button key={p.id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => pick(p)}>
                    <span>{p.name}</span><span className="text-muted-foreground">{formatINR(p.purchase_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {line.productId && <PricingInputs line={line} onPatch={onPatch} />}
    </div>
  );
}

function NewProductFields({ line, onPatch }: { line: Line; onPatch: (p: Partial<Line>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MiniField label="Name"><Input value={line.productName} onChange={(e) => onPatch({ productName: e.target.value })} className="h-9" /></MiniField>
      <MiniField label="Code"><Input value={line.productCode} onChange={(e) => onPatch({ productCode: e.target.value })} placeholder="auto" className="h-9" /></MiniField>
      <MiniField label="HSN (Optional)"><Input value={line.hsn} onChange={(e) => onPatch({ hsn: e.target.value })} className="h-9" /></MiniField>
      <div className="hidden sm:block" />
      <PricingInputs line={line} onPatch={onPatch} />
    </div>
  );
}

function ModeRadio({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-indigo-400/60 bg-indigo-500/15 text-indigo-300" : "border-border text-muted-foreground hover:bg-white/5"
      }`}
    >
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${active ? "border-indigo-400" : "border-muted-foreground"}`}>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
      </span>
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</div>;
}
