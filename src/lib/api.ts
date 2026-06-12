import axios, { AxiosError } from "axios";

/**
 * Single Axios instance for the whole app. All API access goes through this
 * client (no ad-hoc fetch). Base URL defaults to a same-origin "/api" so the
 * Vite dev proxy / nginx can route to the backend.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// The auth store registers a handler so an expired/invalid token logs the user out.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    // Don't bounce on the login/register endpoints — those 401s are expected.
    if (status === 401 && onUnauthorized && !url.includes("/auth/")) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** Shape of the backend error envelope (see docs §5.9). */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export function getApiErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  return axiosErr.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}
