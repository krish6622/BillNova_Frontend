import { Ban, Download, Eye, Printer } from "lucide-react";
import { useState } from "react";

import { Async } from "@/components/common/Async";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InvoiceSideSheet } from "@/components/invoices/InvoiceSideSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import {
  fetchInvoiceForReprint,
  fetchInvoicePdf,
  useCashiers,
  useInvoices,
  useVoidInvoice,
} from "@/features/invoices/api";
import type { InvoiceFilters } from "@/features/invoices/types";
import { type InvoiceType, openPdfBlob, printInvoiceByType } from "@/features/sales/print";
import { useSettings } from "@/features/settings/api";
import { getApiErrorMessage } from "@/lib/api";
import { can } from "@/lib/rbac";
import { formatINR } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const LIMIT = 15;
const EMPTY: InvoiceFilters = { page: 1, limit: LIMIT };

export default function InvoiceRegister() {
  const [filters, setFilters] = useState<InvoiceFilters>(EMPTY);
  const { data, isLoading, isError } = useInvoices(filters);
  const { data: cashiers } = useCashiers();
  const { data: settings } = useSettings();
  const voidInvoice = useVoidInvoice();

  const role = useAuth((s) => s.user?.role);
  const canVoid = can(role, "invoice:void");
  const canExport = can(role, "invoice:export");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toVoid, setToVoid] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoiceType: InvoiceType = settings?.invoice_type ?? "thermal_80";
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  const patch = (p: Partial<InvoiceFilters>) => setFilters((f) => ({ ...f, ...p, page: 1 }));

  const reprint = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      printInvoiceByType(await fetchInvoiceForReprint(id), invoiceType);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const download = async (id: string) => {
    setBusyId(id);
    try {
      openPdfBlob(await fetchInvoicePdf(id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Invoice Register</h1>
        <p className="text-sm text-muted-foreground">All bills — search, reprint, void, or export. (F9)</p>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.03] p-4 sm:grid-cols-3 lg:grid-cols-6">
        <FilterField label="Invoice #">
          <Input
            value={filters.invoice_number ?? ""}
            onChange={(e) => patch({ invoice_number: e.target.value })}
            placeholder="Search…"
            className="h-9"
          />
        </FilterField>
        <FilterField label="From">
          <Input type="date" value={filters.date_from ?? ""} onChange={(e) => patch({ date_from: e.target.value })} className="h-9" />
        </FilterField>
        <FilterField label="To">
          <Input type="date" value={filters.date_to ?? ""} onChange={(e) => patch({ date_to: e.target.value })} className="h-9" />
        </FilterField>
        <FilterField label="Payment">
          <Select value={filters.payment_mode ?? ""} onChange={(v) => patch({ payment_mode: v })}
            options={[["", "All"], ["Cash", "Cash"], ["UPI", "UPI"], ["Card", "Card"]]} />
        </FilterField>
        <FilterField label="Cashier">
          <Select value={filters.cashier_id ?? ""} onChange={(v) => patch({ cashier_id: v })}
            options={[["", "All"], ...(cashiers ?? []).map((c) => [c.id, c.name] as [string, string])]} />
        </FilterField>
        <FilterField label="Status">
          <Select value={filters.status ?? ""} onChange={(v) => patch({ status: v as InvoiceFilters["status"] })}
            options={[["", "All"], ["active", "Active"], ["void", "Void"]]} />
        </FilterField>
        <FilterField label="Billing Type">
          <Select value={filters.billing_type ?? ""} onChange={(v) => patch({ billing_type: v as InvoiceFilters["billing_type"] })}
            options={[["", "All"], ["WITH_GST", "With GST"], ["WITHOUT_GST", "Without GST"]]} />
        </FilterField>
      </div>
      {(filters.invoice_number || filters.date_from || filters.date_to || filters.payment_mode || filters.cashier_id || filters.status || filters.billing_type) && (
        <button onClick={() => setFilters(EMPTY)} className="mb-3 text-xs text-indigo-400 hover:text-indigo-300">
          Clear filters
        </button>
      )}
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Async isLoading={isLoading} isError={isError} isEmpty={!!data && data.items.length === 0}
        empty={<div className="p-10 text-center text-sm text-muted-foreground">No invoices match these filters.</div>}>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Invoice #</TH><TH>Date &amp; Time</TH><TH>Customer</TH>
                <TH>GST Customer</TH><TH>GSTIN</TH><TH>Billing Type</TH>
                <TH className="text-right">Total</TH><TH>GST Display</TH><TH>Payment</TH><TH>Cashier</TH><TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {data?.items.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-mono text-xs">{inv.invoice_number}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {new Date(inv.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </TD>
                  <TD>{inv.customer_name || <span className="text-muted-foreground">Walk-in</span>}</TD>
                  <TD>{inv.is_gst_customer
                    ? <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400">Yes</span>
                    : <span className="text-muted-foreground">No</span>}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{inv.customer_gstin || "—"}</TD>
                  <TD className="text-muted-foreground">{inv.billing_type === "WITH_GST" ? "With GST" : "Without GST"}</TD>
                  <TD className="text-right font-semibold">{formatINR(inv.grand_total)}</TD>
                  <TD className="text-muted-foreground">
                    {inv.billing_type === "WITHOUT_GST" ? "—" : inv.show_gst_on_invoice ? "Show GST" : "Hide GST"}
                  </TD>
                  <TD className="text-muted-foreground">{inv.payment_modes.join(", ") || "—"}</TD>
                  <TD className="text-muted-foreground">{inv.cashier_name ?? "—"}</TD>
                  <TD>
                    <span className={inv.status === "void"
                      ? "rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                      : "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"}>
                      {inv.status === "void" ? "Void" : "Active"}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="View" onClick={() => setSelectedId(inv.id)}><Eye className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Reprint" disabled={busyId === inv.id || inv.status === "void"} onClick={() => reprint(inv.id)}>
                        <Printer className="h-4 w-4" />
                      </IconBtn>
                      {canExport && (
                        <IconBtn title="Download PDF" disabled={busyId === inv.id} onClick={() => download(inv.id)}>
                          <Download className="h-4 w-4" />
                        </IconBtn>
                      )}
                      {canVoid && (
                        <IconBtn title="Void" disabled={inv.status === "void"} danger onClick={() => setToVoid(inv.id)}>
                          <Ban className="h-4 w-4" />
                        </IconBtn>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
          <span>Page {filters.page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
        </div>
      </Async>

      <InvoiceSideSheet invoiceId={selectedId} invoiceType={invoiceType} onClose={() => setSelectedId(null)} />

      <ConfirmDialog
        open={!!toVoid}
        title="Void this invoice?"
        description="The sale is reversed: stock returns to inventory and it is removed from sales reports. This cannot be undone."
        confirmLabel="Void Invoice"
        pending={voidInvoice.isPending}
        onConfirm={() => {
          if (!toVoid) return;
          voidInvoice.mutate(toVoid, {
            onSuccess: () => setToVoid(null),
            onError: (err) => { setError(getApiErrorMessage(err)); setToVoid(null); },
          });
        }}
        onCancel={() => setToVoid(null)}
      />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
      {options.map(([v, l]) => <option key={v} value={v} className="bg-popover text-popover-foreground">{l}</option>)}
    </select>
  );
}

function IconBtn({ title, onClick, disabled, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border border-border p-1.5 transition-colors disabled:opacity-40 ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
