import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface Subscription {
  plan: string | null;
  status: string;
  monthly_bill_limit: number;
  usage: { year: number; month: number; bills_count: number; percent: number };
  warning: "APPROACHING_LIMIT" | "LIMIT_REACHED" | null;
  period_end: string | null;
}

export interface Plan {
  id: string;
  name: string;
  monthly_bill_limit: number;
  price_inr: number;
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await api.get<Subscription>("/subscription");
      return data;
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: async () => {
      const { data } = await api.get<Plan[]>("/subscription/plans");
      return data;
    },
  });
}
