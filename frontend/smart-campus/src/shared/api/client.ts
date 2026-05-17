import axios, { AxiosError } from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const TOKEN_KEY = "sc.token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

function isExternalSessionError(err: AxiosError) {
  const body = err.response?.data as
    | { error?: { message?: string } }
    | undefined;
  return body?.error?.message?.toLowerCase().includes("isu session expired");
}

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !isExternalSessionError(err)) {
      tokenStorage.clear();
      onUnauthorized?.();
    }
    return Promise.reject(err);
  },
);

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as
      | { error?: { message?: string } }
      | undefined;
    return body?.error?.message ?? err.message ?? "Ошибка сети";
  }
  return (err as Error)?.message ?? "Неизвестная ошибка";
}
