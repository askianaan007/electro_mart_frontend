import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { ChequeStatus, PaymentMode, PaginationParams } from '@/lib/api/types';

export type CreditsSummaryParams = PaginationParams & { onlyOutstanding?: boolean };

export const creditKeys = {
  all: ['credits'] as const,
  summary: (params: CreditsSummaryParams) => [...creditKeys.all, 'summary', params] as const,
  detail: (supplierId: string) => [...creditKeys.all, 'detail', supplierId] as const,
};

export function useCreditsSummary(params: CreditsSummaryParams) {
  return useQuery({
    queryKey: creditKeys.summary(params),
    queryFn: () => api.credits.summary(params),
    placeholderData: (prev) => prev,
  });
}

export function useSupplierCreditDetail(supplierId: string | undefined) {
  return useQuery({
    queryKey: creditKeys.detail(supplierId ?? ''),
    queryFn: () => api.credits.detail(supplierId as string),
    enabled: !!supplierId,
  });
}

export function useCreateSettlement(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      mode: PaymentMode;
      reference?: string;
      paymentDate: string;
      chequeDepositDate?: string;
      remarks?: string;
    }) => api.credits.createSettlement(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { paymentId: string; status: Extract<ChequeStatus, 'CLEARED' | 'RETURNED'> }) =>
      api.credits.updateChequeStatus(vars.paymentId, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
