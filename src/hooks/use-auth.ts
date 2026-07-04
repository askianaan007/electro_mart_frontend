import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { useAuthStore } from '@/stores/auth-store';
import type { Role } from '@/lib/api/types';

export function useAdminLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) => api.auth.adminLogin(vars.email, vars.password),
    onSuccess: (data) => setSession(data),
  });
}

export function useDealerLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (vars: { username: string; password: string }) =>
      api.auth.dealerLogin(vars.username, vars.password),
    onSuccess: (data) => setSession(data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (vars: { identifier: string; role: Role }) =>
      api.auth.forgotPassword(vars.identifier, vars.role),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; role: Role; newPassword: string }) =>
      api.auth.resetPassword(vars.token, vars.role, vars.newPassword),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await api.auth.logout(refreshToken).catch(() => undefined);
      }
    },
    onSettled: () => clearSession(),
  });
}
