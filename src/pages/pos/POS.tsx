import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { useProducts } from "@/features/products/api";
import { fetchInvoice, useCreateSale, usePreview, useSales } from "@/features/sales/api";
import { printInvoice } from "@/features/sales/print";
import type { CreateSaleRequest, PaymentInput } from "@/features/sales/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/stores/cart";

type Mode = "Cash" | "UPI" | "Card";
const MODES: Mode[] = ["Cash", "UPI", "Card"];

export default function POS() {
  const cart = useCart();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<PaymentInput[]>([{ mode: "Cash", amount: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);

  const { data: products } = useProducts({ search, page: 1, limit: 8 });
  const createSale = useCreateSale();

  const previewBody = useMemo(
    () => ({
      items: cart.lines.map((l) => ({
        product_id: l.productId,
        quantity: l.quantity,
        discount: l.discount,
      })),
      bill_discount: cart.billDiscount,
    }),
    [cart.lines, cart.billDiscount],
  );
  const hasValidLines = cart.lines.length > 0 && cart.lines.every((l) => l.quantity > 0);
  const { data: preview } = usePreview(previewBody, hasValidLines);

  const grandTotal = preview?.totals.grand_total ?? 0;
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paid) * 100) / 100;

  useEffect(() => searchRef.current?.focus(), []);

  const addFirstResult = () => {
    const first = products?.items[0];
    if (first) {
      cart.addProduct(first);
      setSearch("");
      searchRef.current?.focus();
    }
  };

  const payFull = () => setPayments([{ mode: "Cash", amount: grandTotal }]);

  const save = async () => {
    setError(null);
    if (!hasValidLines) return setError("Add at least one product with quantity.");
    if (Math.abs(remaining) > 0.001) return setError("Payments must equal the grand total.");
    const body: CreateSaleRequest = {
      ...previewBody,
      notes: cart.notes || null,
      payments: payments.filter((p) => Number(p.amount) > 0),
    };
    try {
      const sale = await createSale.mutateAsync(body);
      const invoice = await fetchInvoice(sale.id);
      printInvoice(invoice);
      cart.clear();
      setPayments([{ mode: "Cash", amount: 0 }]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="grid h-screen grid-cols-[1fr_380px]">
      {/* Left: search + cart */}
      <div className="flex flex-col overflow-hidden p-6">
        <h1 className="text-2xl font-semibold">Billing POS</h1>
        <div className="mt-4 flex gap-2">
          <Input
            ref={searchRef}
            placeholder="Search product by name / code / HSN… (Enter to add)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFirstResult()}
          />
          <Button variant="outline" onClick={() => setRecentOpen(true)}>
            Reprint
          </Button>
        </div>

        {search && products && products.items.length > 0 && (
          <div className="mt-2 rounded-md border bg-card">
            {products.items.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  cart.addProduct(p);
                  setSearch("");
                  searchRef.current?.focus();
                }}
              >
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{p.product_code}</span> {p.name}
                </span>
                <span>{formatINR(p.selling_price)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex-1 overflow-auto rounded-lg border">
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH className="w-24">Qty</TH>
                <TH className="w-28">Disc</TH>
                <TH className="text-right">Amount</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {cart.lines.length === 0 && (
                <TR>
                  <TD className="py-8 text-center text-muted-foreground" colSpan={5}>
                    Cart is empty. Search and add products.
                  </TD>
                </TR>
              )}
              {cart.lines.map((l) => {
                const pline = preview?.items.find((i) => i.product_id === l.productId);
                return (
                  <TR key={l.productId}>
                    <TD>
                      <div className="font-medium">{l.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {l.code} · {formatINR(l.unitPrice)} · GST {l.gstPercentage}%
                      </div>
                    </TD>
                    <TD>
                      <Input
                        type="number"
                        min={0}
                        value={l.quantity}
                        onChange={(e) => cart.setQuantity(l.productId, Number(e.target.value))}
                        className="h-8"
                      />
                    </TD>
                    <TD>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={l.discount}
                        onChange={(e) => cart.setDiscount(l.productId, Number(e.target.value))}
                        className="h-8"
                      />
                    </TD>
                    <TD className="text-right">{formatINR(pline?.line_total ?? 0)}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => cart.remove(l.productId)}>
                        ✕
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </div>

      {/* Right: totals + payment */}
      <div className="flex flex-col border-l bg-card p-6">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-2 p-0">
            <Row label="Taxable" value={preview?.totals.total_taxable ?? 0} />
            <Row label="CGST" value={preview?.totals.total_cgst ?? 0} />
            <Row label="SGST" value={preview?.totals.total_sgst ?? 0} />
            {(preview?.totals.total_igst ?? 0) > 0 && (
              <Row label="IGST" value={preview?.totals.total_igst ?? 0} />
            )}
            <div className="flex items-center justify-between pt-1 text-sm">
              <span className="text-muted-foreground">Bill Discount</span>
              <Input
                type="number"
                min={0}
                step="any"
                value={cart.billDiscount}
                onChange={(e) => cart.setBillDiscount(Number(e.target.value))}
                className="h-8 w-28 text-right"
              />
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-semibold">
              <span>Grand Total</span>
              <span>{formatINR(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Payments</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={payFull}>
                Full Cash
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayments((p) => [...p, { mode: "UPI", amount: 0 }])}
              >
                + Split
              </Button>
            </div>
          </div>
          {payments.map((p, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={p.mode}
                onChange={(e) =>
                  setPayments((arr) =>
                    arr.map((x, idx) => (idx === i ? { ...x, mode: e.target.value as Mode } : x)),
                  )
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                step="any"
                value={p.amount}
                onChange={(e) =>
                  setPayments((arr) =>
                    arr.map((x, idx) => (idx === i ? { ...x, amount: Number(e.target.value) } : x)),
                  )
                }
                className="h-9 text-right"
              />
              {payments.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPayments((arr) => arr.filter((_, idx) => idx !== i))}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Remaining</span>
            <span className={Math.abs(remaining) > 0.001 ? "text-destructive" : ""}>
              {formatINR(remaining)}
            </span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-auto space-y-2 pt-4">
          <Button
            className="w-full"
            size="lg"
            disabled={!hasValidLines || createSale.isPending}
            onClick={save}
          >
            {createSale.isPending ? "Saving…" : "Save & Print"}
          </Button>
          <Button variant="outline" className="w-full" onClick={cart.clear}>
            Clear Cart
          </Button>
        </div>
      </div>

      <RecentInvoices open={recentOpen} onClose={() => setRecentOpen(false)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatINR(value)}</span>
    </div>
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
          <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="font-mono">{s.invoice_number}</span>
            <span>{formatINR(s.grand_total)}</span>
            <Button variant="outline" size="sm" onClick={() => reprint(s.id)}>
              Print
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
