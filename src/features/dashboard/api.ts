import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Full business dashboard — returned to Owner (Admin) users. */
export interface OwnerDashboardData {
  scope: "owner";
  today_sales: { amount: number; count: number };
  monthly_sales: { amount: number; count: number };
  bills_this_month: number;
  subscription: { plan: string | null; limit: number; used: number; percent: number };
  low_stock_count: number;
  trend: { date: string; total: number }[];
  top_products: { name: string; quantity: number; amount: number }[];
}

/** Limited dashboard — returned to Cashier users (their own billing only). */
export interface CashierDashboardData {
  scope: "cashier";
  today_bills: { count: number; amount: number };
  today_collection: number;
  bills_generated: number;
  recent_bills: {
    id: string;
    invoice_number: string;
    created_at: string;
    grand_total: number;
    status: string;
  }[];
}

export type DashboardData = OwnerDashboardData | CashierDashboardData;

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>("/dashboard");
      return data;
    },
  });
}
