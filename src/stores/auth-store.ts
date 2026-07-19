import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthResponse, AuthUser } from '@/lib/api/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setSession: (session: AuthResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'electromart-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * "Remember me" — call before setSession on login. Checked (the default)
 * keeps the existing behavior: the session survives closing the browser.
 * Unchecked switches to sessionStorage instead, so it only survives page
 * reloads and clears once the tab/browser closes — same token lifetime
 * either way, just where it's allowed to outlive the tab.
 */
export function setRememberMe(remember: boolean) {
  useAuthStore.persist.setOptions({
    storage: createJSONStorage(() => (remember ? localStorage : sessionStorage)),
  });
}
