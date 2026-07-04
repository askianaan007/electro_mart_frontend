import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
