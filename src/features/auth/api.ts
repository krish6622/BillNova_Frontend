import { api } from "@/lib/api";

import type { AuthResponse, LoginPayload } from "./types";

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
}
