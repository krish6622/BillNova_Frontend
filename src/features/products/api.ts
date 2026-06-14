import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import type { Page, Product, ProductListParams, ProductUpdate } from "./types";

const KEY = "products";

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<Page<Product>>("/products", {
        params: { page: params.page, limit: params.limit, search: params.search || undefined },
      });
      return data;
    },
  });
}

export function useRecentProducts(limit = 12) {
  return useQuery({
    queryKey: [KEY, "recent", limit],
    queryFn: async () => (await api.get<Product[]>("/products/recent", { params: { limit } })).data,
  });
}

export function useTopSellingProducts(limit = 12) {
  return useQuery({
    queryKey: [KEY, "top-selling", limit],
    queryFn: async () => (await api.get<Product[]>("/products/top-selling", { params: { limit } })).data,
  });
}

export function useNextProductCode() {
  return useQuery({
    queryKey: [KEY, "next-code"],
    queryFn: async () => (await api.get<{ product_code: string }>("/products/next-code")).data.product_code,
    staleTime: 0,
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProductUpdate }) => {
      const { data } = await api.put<Product>(`/products/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
