import { useState } from "react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { downloadAuditorExport, downloadReport, useReport, type ReportKey } from "@/features/reports/api";
import { formatINR } from "@/lib/utils";

const REPORTS: { key: ReportKey; label: string }[] = [
  { key: "sales-daily", label: "Daily Sales" },
  { key: "sales-monthly", label: "Monthly Sales" },
  { key: "gst-summary", label: "GST Summary" },
  { key: "hsn-summary", label: "HSN Summary" },
  { key: "gst-sales-register", label: "GST Sales Register" },
  { key: "non-gst-sales-register", label: "Non-GST Sales Register" },
  { key: "gst-customer-register", label: "GST Customer Register" },
  { key: "stock", label: "Current Stock" },
];

// Reports driven by a from/to date range (everything except daily, monthly, stock).
const RANGE_REPORTS = new Set<ReportKey>([
  "gst-summary", "hsn-summary", "gst-sales-register", "non-gst-sales-register", "gst-customer-register",
]);

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1));

export default function Reports() {
  const [report, setReport] = useState<ReportKey>("sales-daily");
  const [date, setDate] = useState(iso(today));
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(iso(today));

  const params: Record<string, unknown> =
    report === "sales-daily"
      ? { date }
      : report === "sales-monthly"
        ? { year, month }
        : report === "stock"
          ? {}
          : { from_date: fromDate, to_date: toDate };

  const { data, isLoading, isError } = useReport(report, params);
  const rangeParams = { from_date: fromDate, to_date: toDate };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Sales, GST, and inventory reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport(report, "excel", params)}>
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => downloadReport(report, "pdf", params)}>
            Export PDF
          </Button>
          <Button onClick={() => downloadAuditorExport(rangeParams)} title="GST + Non-GST registers and combined summary as a .zip">
            Auditor Export
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Report</Label>
          <select
            value={report}
            onChange={(e) => setReport(e.target.value as ReportKey)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {REPORTS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        {report === "sales-daily" && (
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        {report === "sales-monthly" && (
          <>
            <Field label="Year">
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28" />
            </Field>
            <Field label="Month">
              <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-20" />
            </Field>
          </>
        )}
        {RANGE_REPORTS.has(report) && (
          <>
            <Field label="From">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>
          </>
        )}
      </div>

      <Async isLoading={isLoading} isError={isError}>
        <div className="rounded-lg border">{data && <ReportTable report={report} data={data} />}</div>
      </Async>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ReportTable({ report, data }: { report: ReportKey; data: any }) {
  if (report === "sales-daily") {
    const s = data.summary;
    return (
      <SimpleTable
        head={["Metric", "Value"]}
        rows={[
          ["Bills", String(s.bills)],
          ["Gross", formatINR(s.gross)],
          ["Taxable", formatINR(s.taxable)],
          ["GST", formatINR(s.gst)],
          ["Discount", formatINR(s.discount)],
        ]}
      />
    );
  }
  if (report === "sales-monthly") {
    return (
      <SimpleTable
        head={["Date", "Bills", "Total"]}
        rows={[
          ...data.days.map((d: any) => [d.date, String(d.bills), formatINR(d.total)]),
          ["TOTAL", String(data.summary.bills), formatINR(data.summary.gross)],
        ]}
      />
    );
  }
  if (report === "gst-summary") {
    return (
      <SimpleTable
        head={["GST %", "Taxable", "CGST", "SGST", "IGST", "Total GST"]}
        rows={data.rows.map((r: any) => [
          `${r.gst_percentage}%`, formatINR(r.taxable), formatINR(r.cgst),
          formatINR(r.sgst), formatINR(r.igst), formatINR(r.total_gst),
        ])}
      />
    );
  }
  if (report === "hsn-summary") {
    return (
      <SimpleTable
        head={["HSN", "Qty", "Taxable", "GST"]}
        rows={data.rows.map((r: any) => [r.hsn_code, String(r.quantity), formatINR(r.taxable), formatINR(r.gst)])}
      />
    );
  }
  if (report === "gst-sales-register") {
    return (
      <SimpleTable
        head={["Invoice No", "Customer", "GSTIN", "Taxable", "GST", "Total"]}
        rows={[
          ...data.rows.map((r: any) => [
            r.invoice_number, r.customer_name, r.gstin || "—",
            formatINR(r.taxable), formatINR(r.gst), formatINR(r.total),
          ]),
          ["TOTAL", "", "", formatINR(data.totals.taxable), formatINR(data.totals.gst), formatINR(data.totals.total)],
        ]}
      />
    );
  }
  if (report === "non-gst-sales-register") {
    return (
      <SimpleTable
        head={["Invoice No", "Customer", "Total"]}
        rows={[
          ...data.rows.map((r: any) => [r.invoice_number, r.customer_name, formatINR(r.total)]),
          ["TOTAL", "", formatINR(data.totals.total)],
        ]}
      />
    );
  }
  if (report === "gst-customer-register") {
    return (
      <SimpleTable
        head={["Invoice No", "Customer", "GSTIN", "Total"]}
        rows={[
          ...data.rows.map((r: any) => [r.invoice_number, r.customer_name, r.gstin || "—", formatINR(r.total)]),
          ["TOTAL", "", "", formatINR(data.totals.total)],
        ]}
      />
    );
  }
  // stock
  return (
    <SimpleTable
      head={["Code", "Name", "Stock", "Cost", "Value"]}
      rows={[
        ...data.rows.map((r: any) => [
          r.product_code, r.name, String(r.current_stock), formatINR(r.purchase_price), formatINR(r.stock_value),
        ]),
        ["", "TOTAL", "", "", formatINR(data.total_value)],
      ]}
    />
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <Table>
      <THead>
        <TR>{head.map((h, i) => <TH key={i} className={i === 0 ? "" : "text-right"}>{h}</TH>)}</TR>
      </THead>
      <TBody>
        {rows.length === 0 && (
          <TR><TD colSpan={head.length} className="py-6 text-center text-muted-foreground">No data.</TD></TR>
        )}
        {rows.map((row, ri) => (
          <TR key={ri}>
            {row.map((cell, ci) => (
              <TD key={ci} className={ci === 0 ? "" : "text-right"}>{cell}</TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
