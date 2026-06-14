import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ReportKey =
  | "sales-daily"
  | "sales-monthly"
  | "gst-summary"
  | "hsn-summary"
  | "stock"
  | "gst-sales-register"
  | "non-gst-sales-register"
  | "gst-customer-register";

const JSON_URL: Record<ReportKey, string> = {
  "sales-daily": "/reports/sales/daily",
  "sales-monthly": "/reports/sales/monthly",
  "gst-summary": "/reports/gst/summary",
  "hsn-summary": "/reports/gst/hsn",
  stock: "/reports/inventory/stock",
  "gst-sales-register": "/reports/gst/sales-register",
  "non-gst-sales-register": "/reports/non-gst/sales-register",
  "gst-customer-register": "/reports/gst/customer-register",
};

export function useReport(report: ReportKey, params: Record<string, unknown>) {
  return useQuery({
    queryKey: ["reports", report, params],
    queryFn: async () => {
      const { data } = await api.get(JSON_URL[report], { params });
      return data;
    },
  });
}

/** Download a report as PDF or Excel via the export endpoint (carries auth). */
export async function downloadReport(
  report: ReportKey,
  format: "pdf" | "excel",
  params: Record<string, unknown>,
) {
  const { data } = await api.get(`/reports/${report}/export`, {
    params: { format, ...params },
    responseType: "blob",
  });
  const ext = format === "excel" ? "xlsx" : "pdf";
  triggerDownload(data as Blob, `${report}.${ext}`);
}

/** Download the auditor export package (.zip) — GST + Non-GST registers + combined summary. */
export async function downloadAuditorExport(params: Record<string, unknown>) {
  const { data } = await api.get("/reports/auditor/export", { params, responseType: "blob" });
  triggerDownload(data as Blob, "auditor-export.zip");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
