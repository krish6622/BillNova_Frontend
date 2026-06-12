import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import type {
  CreateSaleRequest,
  Invoice,
  PreviewRequest,
  PreviewResponse,
  Sale,
  SaleListItem,
} from "./types";
import type { Page } from "@/features/products/types";

export function usePreview(body: PreviewRequest, enabled: boolean) {
  return useQuery({
    queryKey: ["sale-preview", body],
    enabled,
    queryFn: async () => {
      const { data } = await api.post<PreviewResponse>("/sales/preview", body);
      return data;
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSaleRequest) => {
      const { data } = await api.post<Sale>("/sales", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useSales(page: number, limit: number) {
  return useQuery({
    queryKey: ["sales", { page, limit }],
    queryFn: async () => {
      const { data } = await api.get<Page<SaleListItem>>("/sales", { params: { page, limit } });
      return data;
    },
  });
}

export async function fetchInvoice(saleId: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/sales/${saleId}/invoice`);
  return data;
}
