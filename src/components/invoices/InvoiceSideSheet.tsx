import { Download, Loader2, Printer } from "lucide-react";

import { Async } from "@/components/common/Async";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ThermalInvoicePreview } from "@/components/invoices/ThermalInvoicePreview";
import { fetchInvoicePdf, useInvoiceDetail } from "@/features/invoices/api";
import { type InvoiceType, openPdfBlob, printInvoiceByType } from "@/features/sales/print";
import { useState } from "react";

interface Props {
  invoiceId: string | null;
  invoiceType: InvoiceType;
  onClose: () => void;
}

/** Right slide-over showing the thermal preview + Reprint / Download PDF / Close.
 *  ESC (handled by Sheet) closes it — no new tab, no page navigation. */
export function InvoiceSideSheet({ invoiceId, invoiceType, onClose }: Props) {
  const { data: invoice, isLoading, isError } = useInvoiceDetail(invoiceId);
  const [downloading, setDownloading] = useState(false);
  const previewWidth = invoiceType === "thermal_58" ? 58 : 80;

  const download = async () => {
    if (!invoiceId) return;
    setDownloading(true);
    try {
      openPdfBlob(await fetchInvoicePdf(invoiceId));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet
      open={!!invoiceId}
      onClose={onClose}
      title="Invoice"
      description={invoice?.sale.invoice_number}
    >
      <div className="flex-1 overflow-y-auto px-4">
        <Async isLoading={isLoading} isError={isError}>
          {invoice && <ThermalInvoicePreview invoice={invoice} widthMm={previewWidth} />}
        </Async>
      </div>
      <div className="flex gap-2 border-t border-border p-4">
        <Button
          className="flex-1"
          disabled={!invoice || invoice.sale.status === "void"}
          onClick={() => invoice && printInvoiceByType(invoice, invoiceType)}
        >
          <Printer className="mr-1.5 h-4 w-4" /> Reprint
        </Button>
        <Button variant="outline" className="flex-1" disabled={!invoice || downloading} onClick={download}>
          {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
          PDF
        </Button>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Sheet>
  );
}
