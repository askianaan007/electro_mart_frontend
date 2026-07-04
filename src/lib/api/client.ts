import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiErrorShape } from './types';

const AUTH_FREE_PATHS = ['/auth/admin/login', '/auth/dealer/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

export class ApiError extends Error {
  statusCode: number;
  errorName: string;
  path: string;

  constructor(shape: ApiErrorShape) {
    super(Array.isArray(shape.message) ? shape.message.join(', ') : shape.message);
    this.statusCode = shape.statusCode;
    this.errorName = shape.error;
    this.path = shape.path;
  }

  get messages(): string[] {
    return this.message.split(', ');
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const isAuthFree = AUTH_FREE_PATHS.some((path) => config.url?.startsWith(path));
  if (!isAuthFree) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/refresh`,
      { refreshToken },
    );
    useAuthStore.getState().setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    useAuthStore.getState().clearSession();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorShape>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthFree = originalRequest?.url && AUTH_FREE_PATHS.some((path) => originalRequest.url?.startsWith(path));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthFree) {
      originalRequest._retry = true;

      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return apiClient.request(originalRequest);
      }
    }

    if (error.response?.data) {
      return Promise.reject(new ApiError(error.response.data));
    }

    return Promise.reject(
      new ApiError({
        statusCode: 0,
        error: 'Network Error',
        message: error.message || 'Unable to reach the server',
        path: originalRequest?.url ?? '',
        timestamp: new Date().toISOString(),
      }),
    );
  },
);
