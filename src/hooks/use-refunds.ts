import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { dealerKeys } from './use-dealers';
import { supplierKeys } from './use-suppliers';
import { liquidCashKeys } from './use-liquid-cash';
import { creditKeys } from './use-credits';
import { creditBalanceKeys } from './use-credit-balance';
import { balanceSheetKeys } from './use-balance-sheet';
import { dashboardKeys } from './use-dashboard';
import type { ChequeStatus, PaginationParams, PaymentMode, RefundParty } from '@/lib/api/types';

export type RefundParams = PaginationParams & {
  party?: RefundParty;
  dealerId?: string;
  supplierId?: string;
  purchaseId?: string;
};

export const refundKeys = {
  all: ['refunds'] as const,
  lists: () => [...refundKeys.all, 'list'] as const,
  list: (params: RefundParams) => [...refundKeys.lists(), params] as const,
  available: (party: RefundParty, id: string) => [...refundKeys.all, 'available', party, id] as const,
};

export function useRefunds(params: RefundParams) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => api.refunds.list(params),
    placeholderData: (prev) => prev,
  });
}

/** The credit a dealer holds with us / a supplier owes us — the most that can be refunded. */
export function useRefundAvailable(party: RefundParty, id: string | undefined) {
  return useQuery({
    queryKey: refundKeys.available(party, id ?? ''),
    queryFn: () => api.refunds.available(party, id as string),
    enabled: !!id,
  });
}

// A refund moves Liquid Cash and the party's balance, so everything built on
// either has to refetch.
function invalidateRefundRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: refundKeys.all });
  queryClient.invalidateQueries({ queryKey: liquidCashKeys.all });
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: supplierKeys.all });
  queryClient.invalidateQueries({ queryKey: creditKeys.all });
  queryClient.invalidateQueries({ queryKey: creditBalanceKeys.all });
  queryClient.invalidateQueries({ queryKey: balanceSheetKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export type RefundInput = {
  party: RefundParty;
  dealerId?: string;
  supplierId?: string;
  purchaseId?: string;
  amount: number;
  mode: PaymentMode;
  refundDate: string;
  reason: string;
  reference?: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: string;
  confirmDuplicate?: boolean;
};

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RefundInput) => api.refunds.create(data),
    onSuccess: () => invalidateRefundRelated(queryClient),
  });
}

export type RefundUpdateInput = Omit<RefundInput, 'party' | 'dealerId' | 'supplierId' | 'confirmDuplicate'>;

export function useUpdateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: RefundUpdateInput }) => api.refunds.update(vars.id, vars.data),
    onSuccess: () => invalidateRefundRelated(queryClient),
  });
}

export function useRestoreRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.refunds.restore(id),
    onSuccess: () => invalidateRefundRelated(queryClient),
  });
}

export function useUpdateRefundChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ChequeStatus }) =>
      api.refunds.updateChequeStatus(vars.id, vars.status),
    onSuccess: () => invalidateRefundRelated(queryClient),
  });
}

export function useCancelRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) => api.refunds.cancel(vars.id, vars.reason),
    onSuccess: () => invalidateRefundRelated(queryClient),
  });
}
