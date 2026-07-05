import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';

export const equityKeys = {
  all: ['equity'] as const,
  summary: () => [...equityKeys.all, 'summary'] as const,
};

export function useEquitySummary() {
  return useQuery({
    queryKey: equityKeys.summary(),
    queryFn: () => api.equity.summary(),
  });
}
