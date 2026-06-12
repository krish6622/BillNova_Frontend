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

/** Shape of the backend error envelope (see docs §5.9). */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export function getApiErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorBody>;
  return axiosErr.response?.data?.error?.message ?? "Something went wrong. Please try again.";
}
