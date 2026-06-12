import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Page } from "@/features/products/types";

import type { AdjustmentRequest, LedgerEntry, StockItem } from "./types";

export function useStock(search: string, page: number, limit: number) {
  return useQuery({
    queryKey: ["inventory", "stock", { search, page, limit }],
    queryFn: async () => {
      const { data } = await api.get<Page<StockItem>>("/inventory/stock", {
        params: { search: search || undefined, page, limit },
      });
      return data;
    },
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: async () => {
      const { data } = await api.get<StockItem[]>("/inventory/low-stock");
      return data;
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AdjustmentRequest) => {
      const { data } = await api.post<StockItem>("/inventory/adjust", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export async function fetchLedger(productId: string): Promise<LedgerEntry[]> {
  const { data } = await api.get<LedgerEntry[]>(`/inventory/ledger/${productId}`);
  return data;
}
