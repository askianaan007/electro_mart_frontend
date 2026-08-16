import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { CreditBalanceEntryType, PaginationParams } from '@/lib/api/types';

export type CreditBalanceHistoryParams = PaginationParams & {
  type?: CreditBalanceEntryType;
  dateFrom?: string;
  dateTo?: string;
};

export const creditBalanceKeys = {
  all: ['credit-balance'] as const,
  summary: () => [...creditBalanceKeys.all, 'summary'] as const,
  history: (params: CreditBalanceHistoryParams) => [...creditBalanceKeys.all, 'history', params] as const,
};

export function useCreditBalanceSummary() {
  return useQuery({
    queryKey: creditBalanceKeys.summary(),
    queryFn: () => api.creditBalance.summary(),
  });
}

export function useCreditBalanceHistory(params: CreditBalanceHistoryParams) {
  return useQuery({
    queryKey: creditBalanceKeys.history(params),
    queryFn: () => api.creditBalance.history(params),
    placeholderData: (prev) => prev,
  });
}
