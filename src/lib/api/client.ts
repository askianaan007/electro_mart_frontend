import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiErrorShape } from './types';

const AUTH_FREE_PATHS = ['/auth/admin/login', '/auth/dealer/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

export class ApiError extends Error {
  statusCode: number;
  errorName: string;
  path: string;

  constructor(shape: ApiErrorShape) {
    const message =
      (Array.isArray(shape.message) ? shape.message.join(', ') : shape.message) ||
      (shape.statusCode === 413 ? 'File is too large' : 'Something went wrong. Please try again.');
    super(message);
    this.statusCode = shape.statusCode;
    this.errorName = shape.error;
    this.path = shape.path;
  }

  get messages(): string[] {
    return this.message.split(', ');
  }
}

// A request that already went through a successful token refresh (fresh,
// valid-looking tokens) but STILL 401s means the token itself isn't the
// problem — the account was deactivated server-side since the tokens were
// issued. The local session has to be torn down explicitly; nothing else
// will ever detect this on its own (isLoading/data alone can't tell "auth
// failed" apart from "genuinely no data").
let loggingOut = false;
function forceLogout(message: string) {
  if (loggingOut) return;
  loggingOut = true;
  useAuthStore.getState().clearSession();
  if (typeof window !== 'undefined') {
    toast.error(message);
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
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

// Refresh tokens rotate server-side (a new one is issued and the old one
// revoked every time), so two near-simultaneous refreshes — e.g. this app
// open in two tabs — must never both fire: whichever loses the race would
// present an already-revoked token and get wrongly logged out. Zustand's
// `persist` only writes to localStorage, it doesn't push updates to other
// open tabs on its own, so each tab also needs to pull in whatever the
// others just wrote.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'electromart-auth') {
      void useAuthStore.persist.rehydrate();
    }
  });
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/auth/refresh`,
      { refreshToken },
    );
    useAuthStore.getState().setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  } catch (err) {
    // Only a genuine rejection from the server — the refresh token is
    // invalid, revoked, or actually expired — means the session is really
    // over. A network blip or the API being briefly unreachable must not
    // log the user out; the next request (or the background scheduler)
    // just tries again on its own.
    if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 400)) {
      forceLogout('Your session has ended. Please log in again.');
    }
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Cross-tab-safe token refresh. `staleToken` is whatever access token the
 * caller believed was dead when it decided to refresh — if another tab (or
 * an earlier call in this one) has already rotated past it by the time we
 * actually get to run, we reuse that instead of rotating again.
 */
export async function refreshAccessToken(staleToken: string | null): Promise<string | null> {
  const current = useAuthStore.getState().accessToken;
  if (current && current !== staleToken) return current;

  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('electromart-token-refresh', async () => {
      const latest = useAuthStore.getState().accessToken;
      if (latest && latest !== staleToken) return latest;

      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      return refreshPromise;
    });
  }

  // Browsers without the Web Locks API only get same-tab deduplication —
  // the cross-tab race is rarer than the single-tab one this still covers.
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorShape>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthFree = originalRequest?.url && AUTH_FREE_PATHS.some((path) => originalRequest.url?.startsWith(path));

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthFree) {
      originalRequest._retry = true;

      const staleToken = useAuthStore.getState().accessToken;
      const newAccessToken = await refreshAccessToken(staleToken);
      if (newAccessToken) {
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        try {
          return await apiClient.request(originalRequest);
        } catch (retryError) {
          // By this point the retried request has already been through this
          // same interceptor once (its own _retry is already true, so it
          // skipped the refresh branch above and was converted straight to
          // an ApiError) — a fresh, valid-looking token that still 401s
          // means the account itself was rejected, not the token.
          if (retryError instanceof ApiError && retryError.statusCode === 401) {
            forceLogout('Your account is no longer active. Please contact your administrator.');
          }
          throw retryError;
        }
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
