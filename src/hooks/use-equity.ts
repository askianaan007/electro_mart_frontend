import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export type EquityHistoryParams = PaginationParams & {
  type?: 'INVESTMENT' | 'WITHDRAWAL' | 'EXPENSE';
  investorId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const equityKeys = {
  all: ['equity'] as const,
  summary: () => [...equityKeys.all, 'summary'] as const,
  history: (params: EquityHistoryParams) => [...equityKeys.all, 'history', params] as const,
};

export function useEquitySummary() {
  return useQuery({
    queryKey: equityKeys.summary(),
    queryFn: () => api.equity.summary(),
  });
}

export function useEquityHistory(params: EquityHistoryParams) {
  return useQuery({
    queryKey: equityKeys.history(params),
    queryFn: () => api.equity.history(params),
    placeholderData: (prev) => prev,
  });
}
