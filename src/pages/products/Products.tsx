import { useEffect, useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useProducts, useUpdateProduct } from "@/features/products/api";
import { previewSellingPrice, type Product } from "@/features/products/types";
import { fetchLedger } from "@/features/inventory/api";
import type { LedgerEntry } from "@/features/inventory/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LIMIT = 10;

export default function Products() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [ledgerOf, setLedgerOf] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useProducts({ search, page, limit: LIMIT });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Product Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Products are created from purchases. Edit pricing, markup and status here.
        </p>
      </div>

      <div className="mb-4 max-w-sm">
        <Input placeholder="Search by name, code or HSN…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
      </div>

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}
        empty={<div className="rounded-2xl border border-border p-12 text-center text-muted-foreground">No products yet — record a purchase to add your first product.</div>}>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Code</TH><TH>Name</TH>
                <TH className="text-right">Purchase</TH><TH className="text-right">Selling</TH>
                <TH className="text-right">Stock</TH><TH className="text-right">GST</TH>
                <TH>Status</TH><TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.items.map((p) => (
                <TR key={p.id} className={p.is_active ? "" : "opacity-50"}>
                  <TD className="font-mono text-xs">{p.product_code}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-right">{formatINR(p.purchase_price)}</TD>
                  <TD className="text-right font-semibold text-indigo-600 dark:text-indigo-300">{formatINR(p.selling_price)}</TD>
                  <TD className="text-right">{p.current_stock} {p.unit}</TD>
                  <TD className="text-right">{p.gst_percentage}%</TD>
                  <TD>
                    <span className={p.is_active ? "text-emerald-400" : "text-muted-foreground"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setLedgerOf(p)}>Ledger</Button>
                    </div>
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

      {editing && <EditDialog product={editing} onClose={() => setEditing(null)} />}
      {ledgerOf && <LedgerDialog product={ledgerOf} onClose={() => setLedgerOf(null)} />}
    </div>
  );
}

function EditDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const update = useUpdateProduct();
  const [name, setName] = useState(product.name);
  const [hsn, setHsn] = useState(product.hsn_code ?? "");
  const [unit, setUnit] = useState(product.unit);
  const [gst, setGst] = useState(product.gst_percentage);
  const [reorder, setReorder] = useState(product.reorder_level);
  const [markupAmount, setMarkupAmount] = useState(product.markup_amount);
  const [active, setActive] = useState(product.is_active);
  const [error, setError] = useState<string | null>(null);

  const selling = previewSellingPrice(product.purchase_price, markupAmount);

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        id: product.id,
        input: { name, hsn_code: hsn || null, unit, gst_percentage: gst, reorder_level: reorder,
          markup_amount: markupAmount, is_active: active },
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogHeader title={`Edit · ${product.product_code}`} description="Selling price = purchase price + markup amount." />
      <div className="space-y-3">
        <Field label="Product Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="HSN Code"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} /></Field>
          <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
          <Field label="GST %"><Input type="number" value={gst} onChange={(e) => setGst(Number(e.target.value))} /></Field>
          <Field label="Reorder Level"><Input type="number" value={reorder} onChange={(e) => setReorder(Number(e.target.value))} /></Field>
        </div>

        <div className="rounded-xl border border-border bg-white/[0.03] p-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase Price">
              <Input value={formatINR(product.purchase_price)} readOnly className="opacity-70" />
            </Field>
            <Field label="Markup (₹)">
              <Input type="number" value={markupAmount} onChange={(e) => setMarkupAmount(Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Calculated Selling Price</span>
            <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">{formatINR(selling)}</span>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
          Active (visible in POS &amp; search)
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={update.isPending} onClick={save}>{update.isPending ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </Dialog>
  );
}

function LedgerDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  useEffect(() => { fetchLedger(product.id).then(setEntries); }, [product.id]);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogHeader title={`Stock Ledger · ${product.name}`} />
      <div className="max-h-[55vh] overflow-auto">
        <Table>
          <THead><TR><TH>Date</TH><TH>Type</TH><TH className="text-right">Qty</TH><TH className="text-right">Balance</TH><TH>Note</TH></TR></THead>
          <TBody>
            {entries?.length === 0 && <TR><TD colSpan={5} className="py-6 text-center text-muted-foreground">No movements.</TD></TR>}
            {entries?.map((e, i) => (
              <TR key={i}>
                <TD className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-IN")}</TD>
                <TD>{e.type}</TD>
                <TD className="text-right">{e.quantity}</TD>
                <TD className="text-right">{e.balance_after}</TD>
                <TD className="text-xs text-muted-foreground">{e.reason ?? e.ref_type ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
