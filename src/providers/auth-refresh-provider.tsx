'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { refreshAccessToken } from '@/lib/api/client';
import { getTokenExpiryMs } from '@/lib/jwt';

// Refreshes the access token shortly before it actually expires, so renewal
// happens invisibly in the background instead of the user ever hitting a
// live 401 first. As long as this keeps succeeding, the refresh token's
// sliding expiry (renewed on every rotation) keeps pushing the session
// forward indefinitely — the account only ever gets signed out once it
// truly goes unused for that whole window.
const REFRESH_MARGIN_MS = 60_000;
// However short the token's lifetime is configured to be, never schedule
// back-to-back refreshes faster than this — without a floor, a token whose
// entire lifetime is shorter than REFRESH_MARGIN_MS would compute a delay of
// 0 forever and refresh in a tight loop.
const MIN_DELAY_MS = 10_000;

export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;

    const expiryMs = getTokenExpiryMs(accessToken);
    if (!expiryMs) return;

    const delay = Math.max(expiryMs - Date.now() - REFRESH_MARGIN_MS, MIN_DELAY_MS);
    const timer = setTimeout(() => {
      void refreshAccessToken(accessToken);
    }, delay);

    return () => clearTimeout(timer);
  }, [accessToken, hasHydrated]);

  return children;
}
