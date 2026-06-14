import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Page } from "@/features/products/types";
import type { Invoice, Sale } from "@/features/sales/types";

import type { Cashier, InvoiceFilters, InvoiceListItem } from "./types";

/** Drop empty/undefined filter values so they don't hit the API as blank query params. */
function cleanParams(filters: InvoiceFilters): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      const { data } = await api.get<Page<InvoiceListItem>>("/invoices", { params: cleanParams(filters) });
      return data;
    },
  });
}

export function useInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<Invoice>(`/invoices/${id}`);
      return data;
    },
  });
}

export function useCashiers() {
  return useQuery({
    queryKey: ["invoice-cashiers"],
    queryFn: async () => {
      const { data } = await api.get<Cashier[]>("/invoices/cashiers");
      return data;
    },
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Sale>(`/invoices/${id}/void`);
      return data;
    },
    onSuccess: () => {
      // Voiding moves money + stock — refresh everything it touches.
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export async function fetchInvoiceForReprint(id: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/invoices/${id}/reprint`);
  return data;
}

export async function fetchInvoicePdf(id: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/invoices/${id}/pdf`, { responseType: "blob" });
  return data;
}
