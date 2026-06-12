import { create } from "zustand";

import { api, setAccessToken, setUnauthorizedHandler } from "@/lib/api";
import { loginRequest } from "@/features/auth/api";
import type { AuthResponse, LoginPayload, Tenant, User } from "@/features/auth/types";

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
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

function persist(data: PersistedAuth | null) {
  if (data) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  else sessionStorage.removeItem(STORAGE_KEY);
}

function applyAuth(set: (partial: Partial<AuthState>) => void, res: AuthResponse) {
  setAccessToken(res.access_token);
  persist({
    token: res.access_token,
    refreshToken: res.refresh_token,
    user: res.user,
    tenant: res.tenant,
  });
  set({ token: res.access_token, user: res.user, tenant: res.tenant, isAuthenticated: true });
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  tenant: null,
  isAuthenticated: false,

  login: async (payload) => {
    const res = await loginRequest(payload);
    applyAuth(set, res);
  },

  logout: () => {
    // Best-effort server-side revocation; ignore failures.
    api.post("/auth/logout").catch(() => undefined);
    setAccessToken(null);
    persist(null);
    set({ token: null, user: null, tenant: null, isAuthenticated: false });
  },

  hydrate: () => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
