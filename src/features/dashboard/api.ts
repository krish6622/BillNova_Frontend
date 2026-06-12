import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface DashboardData {
  today_sales: { amount: number; count: number };
  monthly_sales: { amount: number; count: number };
  bills_this_month: number;
  subscription: { plan: string | null; limit: number; used: number; percent: number };
  low_stock_count: number;
  trend: { date: string; total: number }[];
  top_products: { name: string; quantity: number; amount: number }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>("/dashboard");
      return data;
    },
  });
}
