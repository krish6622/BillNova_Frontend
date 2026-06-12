import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Page } from "@/features/products/types";

import type { Purchase, PurchaseCreate, PurchaseListItem } from "./types";

export function usePurchases(page: number, limit: number) {
  return useQuery({
    queryKey: ["purchases", { page, limit }],
    queryFn: async () => {
      const { data } = await api.get<Page<PurchaseListItem>>("/purchases", {
        params: { page, limit },
      });
      return data;
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PurchaseCreate) => {
      const { data } = await api.post<Purchase>("/purchases", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCancelPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Purchase>(`/purchases/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
