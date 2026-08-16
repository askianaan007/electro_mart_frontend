import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';

export const balanceSheetKeys = {
  all: ['balance-sheet'] as const,
  summary: () => [...balanceSheetKeys.all, 'summary'] as const,
};

export function useBalanceSheetSummary() {
  return useQuery({
    queryKey: balanceSheetKeys.summary(),
    queryFn: () => api.balanceSheet.summary(),
  });
}
