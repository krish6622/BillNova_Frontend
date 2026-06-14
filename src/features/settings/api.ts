import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface Settings {
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  gst_number: string | null;
  address: string | null;
  place_of_supply: "intra" | "inter";
  invoice_prefix: string;
  invoice_footer: string | null;
  invoice_type: "thermal_80" | "thermal_58" | "a4";
  show_branding: boolean;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<Settings>("/settings");
      return data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Settings>) => {
      const { data } = await api.put<Settings>("/settings", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
