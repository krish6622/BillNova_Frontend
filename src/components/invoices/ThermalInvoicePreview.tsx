import { RECEIPT_CSS, receiptInnerHTML } from "@/features/sales/print";
import type { Invoice } from "@/features/sales/types";

/** Renders the exact thermal receipt body (shared renderer) on a white slip, so the
 *  on-screen preview is pixel-faithful to what the printer produces. */
export function ThermalInvoicePreview({ invoice, widthMm = 80 }: { invoice: Invoice; widthMm?: 80 | 58 }) {
  return (
    <div className="flex justify-center py-2">
      <style>{RECEIPT_CSS}</style>
      <div
        className="rounded-md bg-white shadow-md ring-1 ring-black/10"
        dangerouslySetInnerHTML={{ __html: receiptInnerHTML(invoice, widthMm) }}
      />
    </div>
  );
}
