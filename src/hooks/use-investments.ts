import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { equityKeys } from './use-equity';
import { liquidCashKeys } from './use-liquid-cash';
import { balanceSheetKeys } from './use-balance-sheet';
import { dashboardKeys } from './use-dashboard';
import type { ChequeStatus, PaginationParams } from '@/lib/api/types';

export type InvestmentParams = PaginationParams & {
  investorId?: string;
  type?: 'DEPOSIT' | 'WITHDRAWAL';
  dateFrom?: string;
  dateTo?: string;
};

export const investmentKeys = {
  all: ['investments'] as const,
  lists: () => [...investmentKeys.all, 'list'] as const,
  list: (params: InvestmentParams) => [...investmentKeys.lists(), params] as const,
  detail: (id: string) => [...investmentKeys.all, 'detail', id] as const,
};

export function useInvestments(params: InvestmentParams) {
  return useQuery({
    queryKey: investmentKeys.list(params),
    queryFn: () => api.investments.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvestment(id: string | undefined) {
  return useQuery({
    queryKey: investmentKeys.detail(id ?? ''),
    queryFn: () => api.investments.get(id as string),
    enabled: !!id,
  });
}

// Investment entries feed investor equity, Liquid Cash (cleared/non-cheque entries only),
// the balance sheet and the dashboard — refresh all of them after any write.
function invalidateInvestmentData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: investmentKeys.all });
  queryClient.invalidateQueries({ queryKey: equityKeys.all });
  queryClient.invalidateQueries({ queryKey: liquidCashKeys.all });
  queryClient.invalidateQueries({ queryKey: balanceSheetKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investments.create(data),
    onSuccess: () => invalidateInvestmentData(queryClient),
  });
}

export function useUpdateInvestment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investments.update(id, data),
    onSuccess: () => invalidateInvestmentData(queryClient),
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.investments.remove(id),
    onSuccess: () => invalidateInvestmentData(queryClient),
  });
}

export function useUpdateInvestmentChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ChequeStatus }) =>
      api.investments.updateChequeStatus(id, status),
    onSuccess: () => invalidateInvestmentData(queryClient),
  });
}
