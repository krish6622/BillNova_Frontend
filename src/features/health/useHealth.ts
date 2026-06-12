import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface HealthResponse {
  status: string;
  service: string;
}

/** M0 wiring proof: calls the backend /api/health through the shared client. */
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get<HealthResponse>("/health");
      return data;
    },
  });
}
