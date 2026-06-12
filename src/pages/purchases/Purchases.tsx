import { useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useProducts } from "@/features/products/api";
import { useCancelPurchase, useCreatePurchase, usePurchases } from "@/features/purchases/api";
import type { PurchaseCreate } from "@/features/purchases/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LIMIT = 15;

interface Line {
  product_id: string;
  name: string;
  quantity: number;
  purchase_price: number;
  gst_percentage: number;
}

export default function Purchases() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = usePurchases(page, LIMIT);
  const cancel = useCancelPurchase();
  const [formOpen, setFormOpen] = useState(false);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">Record stock received from suppliers.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>New Purchase</Button>
      </div>

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}>
        <div className="rounded-lg border">
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Supplier</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.items.map((p) => (
                <TR key={p.id}>
                  <TD>{p.purchase_date}</TD>
                  <TD className="font-medium">{p.supplier_name}</TD>
                  <TD className="text-right">{formatINR(p.total_amount)}</TD>
                  <TD>
                    <span className={p.status === "cancelled" ? "text-destructive" : "text-green-600"}>
                      {p.status}
                    </span>
                  </TD>
                  <TD className="text-right">
                    {p.status === "active" && (
                      <Button variant="destructive" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(p.id)}>
                        Cancel
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </Async>

      {formOpen && <PurchaseDialog onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function PurchaseDialog({ onClose }: { onClose: () => void }) {
  const create = useCreatePurchase();
  const today = new Date().toISOString().slice(0, 10);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: products } = useProducts({ search, page: 1, limit: 6 });

  const addProduct = (p: { id: string; name: string; purchase_price: number; gst_percentage: number }) => {
    setLines((ls) =>
      ls.some((l) => l.product_id === p.id)
        ? ls
        : [...ls, { product_id: p.id, name: p.name, quantity: 1, purchase_price: p.purchase_price, gst_percentage: p.gst_percentage }],
    );
    setSearch("");
  };

  const patch = (id: string, key: keyof Line, value: number) =>
    setLines((ls) => ls.map((l) => (l.product_id === id ? { ...l, [key]: value } : l)));

  const total = lines.reduce((s, l) => {
    const base = l.quantity * l.purchase_price;
    return s + base + (base * l.gst_percentage) / 100;
  }, 0);

  const submit = async () => {
    setError(null);
    if (!supplier.trim()) return setError("Supplier name is required.");
    if (lines.length === 0) return setError("Add at least one item.");
    const body: PurchaseCreate = {
      supplier_name: supplier,
      purchase_date: date,
      items: lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        purchase_price: l.purchase_price,
        gst_percentage: l.gst_percentage,
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
    <Dialog open onOpenChange={onClose} className="max-w-2xl">
      <DialogHeader title="New Purchase" />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name" />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Add product</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product…" />
          {search && products && products.items.length > 0 && (
            <div className="rounded-md border">
              {products.items.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addProduct(p)}
                >
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{formatINR(p.purchase_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-md border">
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH className="w-20">Qty</TH>
                <TH className="w-28">Price</TH>
                <TH className="w-20">GST%</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {lines.length === 0 && (
                <TR><TD colSpan={5} className="py-6 text-center text-muted-foreground">No items added.</TD></TR>
              )}
              {lines.map((l) => (
                <TR key={l.product_id}>
                  <TD className="font-medium">{l.name}</TD>
                  <TD>
                    <Input type="number" min={0} step="any" value={l.quantity} className="h-8"
                      onChange={(e) => patch(l.product_id, "quantity", Number(e.target.value))} />
                  </TD>
                  <TD>
                    <Input type="number" min={0} step="any" value={l.purchase_price} className="h-8"
                      onChange={(e) => patch(l.product_id, "purchase_price", Number(e.target.value))} />
                  </TD>
                  <TD>
                    <Input type="number" min={0} step="any" value={l.gst_percentage} className="h-8"
                      onChange={(e) => patch(l.product_id, "gst_percentage", Number(e.target.value))} />
                  </TD>
                  <TD className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setLines((ls) => ls.filter((x) => x.product_id !== l.product_id))}>
                      ✕
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="flex justify-between text-sm font-semibold">
          <span>Total (incl. GST)</span>
          <span>{formatINR(total)}</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={create.isPending} onClick={submit}>
          {create.isPending ? "Saving…" : "Save Purchase"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
