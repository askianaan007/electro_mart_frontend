import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { LiquidCashEntryType, PaginationParams } from '@/lib/api/types';

export type LiquidCashHistoryParams = PaginationParams & {
  type?: LiquidCashEntryType;
  dateFrom?: string;
  dateTo?: string;
};

export const liquidCashKeys = {
  all: ['liquid-cash'] as const,
  summary: () => [...liquidCashKeys.all, 'summary'] as const,
  history: (params: LiquidCashHistoryParams) => [...liquidCashKeys.all, 'history', params] as const,
};

export function useLiquidCashSummary() {
  return useQuery({
    queryKey: liquidCashKeys.summary(),
    queryFn: () => api.liquidCash.summary(),
  });
}

export function useLiquidCashHistory(params: LiquidCashHistoryParams) {
  return useQuery({
    queryKey: liquidCashKeys.history(params),
    queryFn: () => api.liquidCash.history(params),
    placeholderData: (prev) => prev,
  });
}
