import { create } from "zustand";

import { api, setAccessToken, setUnauthorizedHandler } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { loginRequest, registerRequest } from "@/features/auth/api";
import type { AuthResponse, LoginPayload, RegisterPayload, Tenant, User } from "@/features/auth/types";

const STORAGE_KEY = "billnova_auth";

interface PersistedAuth {
  token: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload, remember?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

function persist(data: PersistedAuth | null, remember = false) {
  // "Remember me" → localStorage (survives browser restart); otherwise sessionStorage.
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  if (data) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function applyAuth(set: (partial: Partial<AuthState>) => void, res: AuthResponse, remember = false) {
  // Drop any cached data from a previously signed-in tenant (prevents cross-tenant bleed).
  queryClient.clear();
  setAccessToken(res.access_token);
  persist(
    { token: res.access_token, refreshToken: res.refresh_token, user: res.user, tenant: res.tenant },
    remember,
  );
  set({ token: res.access_token, user: res.user, tenant: res.tenant, isAuthenticated: true });
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  tenant: null,
  isAuthenticated: false,

  login: async (payload, remember = false) => {
    const res = await loginRequest(payload);
    applyAuth(set, res, remember);
  },

  register: async (payload) => {
    const res = await registerRequest(payload);
    applyAuth(set, res, true);
  },

  logout: () => {
    // Best-effort server-side revocation; ignore failures.
    api.post("/auth/logout").catch(() => undefined);
    setAccessToken(null);
    persist(null);
    queryClient.clear(); // wipe cached tenant data on sign-out
    set({ token: null, user: null, tenant: null, isAuthenticated: false });
  },

  hydrate: () => {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as PersistedAuth;
      setAccessToken(data.token);
      set({ token: data.token, user: data.user, tenant: data.tenant, isAuthenticated: true });
    } catch {
      persist(null);
    }
  },
}));

// Wire the API client's 401 handler to log the user out.
setUnauthorizedHandler(() => useAuth.getState().logout());
