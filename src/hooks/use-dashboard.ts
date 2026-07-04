import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  admin: () => [...dashboardKeys.all, 'admin'] as const,
  dealer: () => [...dashboardKeys.all, 'dealer'] as const,
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: dashboardKeys.admin(),
    queryFn: () => api.dashboard.admin(),
    refetchInterval: 60_000,
  });
}

export function useDealerDashboard() {
  return useQuery({
    queryKey: dashboardKeys.dealer(),
    queryFn: () => api.dashboard.dealer(),
    refetchInterval: 60_000,
  });
}
