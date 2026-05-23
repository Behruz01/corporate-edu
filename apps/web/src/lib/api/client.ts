import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type { ProblemDetails } from './types';

const baseURL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ProblemDetails>) => {
    const original = error.config;
    if (!original) throw error;
    const isAuthEndpoint = (original.url ?? '').includes('/auth/');
    if (error.response?.status !== 401 || isAuthEndpoint || (original as { _retry?: boolean })._retry) {
      throw error;
    }
    (original as { _retry?: boolean })._retry = true;
    if (!refreshInFlight) {
      refreshInFlight = refreshToken();
    }
    const newToken = await refreshInFlight;
    refreshInFlight = null;
    if (!newToken) throw error;
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

async function refreshToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(`${baseURL}/auth/refresh`, null, { withCredentials: true });
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}
