import { useState } from "react";

import { Async } from "@/components/common/Async";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useProducts } from "@/features/products/api";
import { previewSellingPrice, type MarginType } from "@/features/products/types";
import { useCancelPurchase, useCreatePurchase, usePurchases } from "@/features/purchases/api";
import type { PurchaseCreate } from "@/features/purchases/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LIMIT = 15;
let lineSeq = 0;

interface Line {
  key: number;
  productId?: string;
  productCode: string;
  productName: string;
  hsn: string;
  gstPercentage: number;
  purchasePrice: number;
  marginType: MarginType;
  marginValue: number;
  quantity: number;
  isNew: boolean;
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
          <p className="text-sm text-muted-foreground">Record stock received — new products are created here.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New Purchase</Button>
      </div>

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Supplier</TH><TH className="text-right">Total</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR>
            </THead>
            <TBody>
              {data?.items.map((p) => (
                <TR key={p.id}>
                  <TD>{p.purchase_date}</TD>
                  <TD className="font-medium">{p.supplier_name}</TD>
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

function newLine(): Line {
  return { key: ++lineSeq, productCode: "", productName: "", hsn: "", gstPercentage: 5,
    purchasePrice: 0, marginType: "percentage", marginValue: 25, quantity: 1, isNew: true };
}

function PurchaseDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePurchase();
  const today = new Date().toISOString().slice(0, 10);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: products } = useProducts({ search, page: 1, limit: 6 });

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const addExisting = (prod: { id: string; product_code: string; name: string; purchase_price: number; gst_percentage: number; margin_type: MarginType; margin_value: number; hsn_code: string | null }) => {
    setLines((ls) => [...ls, {
      key: ++lineSeq, productId: prod.id, productCode: prod.product_code, productName: prod.name,
      hsn: prod.hsn_code ?? "", gstPercentage: prod.gst_percentage, purchasePrice: prod.purchase_price,
      marginType: prod.margin_type, marginValue: prod.margin_value, quantity: 1, isNew: false,
    }]);
    setSearch("");
  };

  const total = lines.reduce((s, l) => {
    const base = l.quantity * l.purchasePrice;
    return s + base + (base * l.gstPercentage) / 100;
  }, 0);

  const submit = async () => {
    setError(null);
    if (!supplier.trim()) return setError("Supplier name is required.");
    if (lines.length === 0) return setError("Add at least one item.");
    for (const l of lines) {
      if (l.isNew && !l.productName.trim()) return setError("New products need a name.");
      if (l.purchasePrice <= 0) return setError("Purchase price must be greater than zero.");
      if (l.quantity <= 0) return setError("Quantity must be greater than zero.");
    }
    const body: PurchaseCreate = {
      supplier_name: supplier,
      purchase_date: date,
      items: lines.map((l) => ({
        product_id: l.isNew ? null : l.productId,
        product_code: l.isNew ? (l.productCode || null) : null,
        product_name: l.isNew ? l.productName : null,
        hsn_code: l.hsn || null,
        gst_percentage: l.gstPercentage,
        unit: "NOS",
        purchase_price: l.purchasePrice,
        margin_type: l.marginType,
        margin_value: l.marginValue,
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
      <DialogHeader title="New Purchase" description="Create new products inline or restock existing ones." />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Supplier"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search to add an EXISTING product…" />
            {search && products && products.items.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-white/10 bg-[#0a1330]">
                {products.items.map((p) => (
                  <button key={p.id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-white/5" onClick={() => addExisting(p)}>
                    <span>{p.name}</span><span className="text-muted-foreground">{formatINR(p.purchase_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => setLines((ls) => [...ls, newLine()])}>+ New Product</Button>
        </div>

        <div className="max-h-[44vh] space-y-2 overflow-auto pr-1">
          {lines.map((l) => {
            const selling = previewSellingPrice(l.purchasePrice, l.marginType, l.marginValue);
            return (
              <div key={l.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {l.isNew ? "New product" : `Existing · ${l.productCode}`}
                  </span>
                  <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-muted-foreground hover:text-destructive">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {l.isNew ? (
                    <>
                      <MiniField label="Name"><Input value={l.productName} onChange={(e) => patch(l.key, { productName: e.target.value })} className="h-9" /></MiniField>
                      <MiniField label="Code (optional)"><Input value={l.productCode} onChange={(e) => patch(l.key, { productCode: e.target.value })} placeholder="auto" className="h-9" /></MiniField>
                      <MiniField label="HSN"><Input value={l.hsn} onChange={(e) => patch(l.key, { hsn: e.target.value })} className="h-9" /></MiniField>
                    </>
                  ) : (
                    <MiniField label="Product"><Input value={l.productName} readOnly className="h-9 opacity-70" /></MiniField>
                  )}
                  <MiniField label="GST %"><Input type="number" value={l.gstPercentage} onChange={(e) => patch(l.key, { gstPercentage: Number(e.target.value) })} className="h-9" /></MiniField>
                  <MiniField label="Purchase ₹"><Input type="number" value={l.purchasePrice} onChange={(e) => patch(l.key, { purchasePrice: Number(e.target.value) })} className="h-9" /></MiniField>
                  <MiniField label="Margin">
                    <div className="flex gap-1">
                      <select value={l.marginType} onChange={(e) => patch(l.key, { marginType: e.target.value as MarginType })} className="h-9 rounded-md border border-input bg-background px-1 text-sm">
                        <option value="percentage" className="bg-[#0a1330]">%</option>
                        <option value="amount" className="bg-[#0a1330]">₹</option>
                      </select>
                      <Input type="number" value={l.marginValue} onChange={(e) => patch(l.key, { marginValue: Number(e.target.value) })} className="h-9" />
                    </div>
                  </MiniField>
                  <MiniField label="Selling ₹"><Input value={selling.toFixed(2)} readOnly className="h-9 opacity-70" /></MiniField>
                  <MiniField label="Qty"><Input type="number" value={l.quantity} onChange={(e) => patch(l.key, { quantity: Number(e.target.value) })} className="h-9" /></MiniField>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-sm font-semibold">
          <span>Total (incl. GST)</span><span>{formatINR(total)}</span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><span className="text-[11px] text-muted-foreground">{label}</span>{children}</div>;
}
