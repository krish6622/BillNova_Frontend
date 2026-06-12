import { useEffect, useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { fetchLedger, useAdjustStock, useStock } from "@/features/inventory/api";
import type { LedgerEntry, StockItem } from "@/features/inventory/types";
import { getApiErrorMessage } from "@/lib/api";
import { formatINR } from "@/lib/utils";

const LIMIT = 15;

export default function Inventory() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useStock(search, page, LIMIT);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [ledgerOf, setLedgerOf] = useState<StockItem | null>(null);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const isLow = (i: StockItem) => i.reorder_level > 0 && i.current_stock <= i.reorder_level;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="text-sm text-muted-foreground">Current stock, ledger, and manual adjustments.</p>

      <div className="my-4 max-w-sm">
        <Input
          placeholder="Search product…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}>
        <div className="rounded-lg border">
          <Table>
            <THead>
              <TR>
                <TH>Code</TH>
                <TH>Name</TH>
                <TH className="text-right">Stock</TH>
                <TH className="text-right">Reorder</TH>
                <TH className="text-right">Value</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.items.map((i) => (
                <TR key={i.product_id}>
                  <TD className="font-mono text-xs">{i.product_code}</TD>
                  <TD className="font-medium">{i.name}</TD>
                  <TD className={`text-right ${isLow(i) ? "font-semibold text-destructive" : ""}`}>
                    {i.current_stock} {isLow(i) && "⚠"}
                  </TD>
                  <TD className="text-right text-muted-foreground">{i.reorder_level}</TD>
                  <TD className="text-right">{formatINR(i.stock_value)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setAdjusting(i)}>
                        Adjust
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLedgerOf(i)}>
                        Ledger
                      </Button>
                    </div>
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

      {adjusting && <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} />}
      {ledgerOf && <LedgerDialog item={ledgerOf} onClose={() => setLedgerOf(null)} />}
    </div>
  );
}

function AdjustDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const adjust = useAdjustStock();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!reason.trim()) return setError("Reason is required.");
    try {
      await adjust.mutateAsync({ product_id: item.product_id, delta, reason });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog open onOpenChange={onClose} className="max-w-sm">
      <DialogHeader title="Adjust Stock" description={`${item.name} — current ${item.current_stock}`} />
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Change (+/-)</Label>
          <Input type="number" step="any" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Stock count correction" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={adjust.isPending} onClick={submit}>
          {adjust.isPending ? "Saving…" : "Apply"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function LedgerDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);

  useEffect(() => {
    fetchLedger(item.product_id).then(setEntries);
  }, [item.product_id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogHeader title={`Stock Ledger — ${item.name}`} />
      <div className="max-h-[55vh] overflow-auto">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH className="text-right">Qty</TH>
              <TH className="text-right">Balance</TH>
              <TH>Note</TH>
            </TR>
          </THead>
          <TBody>
            {entries?.length === 0 && (
              <TR><TD colSpan={5} className="py-6 text-center text-muted-foreground">No movements.</TD></TR>
            )}
            {entries?.map((e, idx) => (
              <TR key={idx}>
                <TD className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("en-IN")}
                </TD>
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
