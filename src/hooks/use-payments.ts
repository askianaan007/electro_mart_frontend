import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { invoiceKeys } from './use-invoices';
import { dealerKeys } from './use-dealers';
import { dashboardKeys } from './use-dashboard';
import type { ChequeStatus, PaginationParams, PaymentMode } from '@/lib/api/types';

type PaymentParams = PaginationParams & {
  mode?: PaymentMode;
  chequeStatus?: ChequeStatus;
  dealerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params: PaymentParams) => [...paymentKeys.lists(), params] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

export function usePayments(params: PaymentParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => api.payments.list(params),
    placeholderData: (prev) => prev,
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => api.payments.get(id as string),
    enabled: !!id,
  });
}

function invalidatePaymentRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

type PaymentInput = {
  amount: number;
  mode: PaymentMode;
  reference?: string;
  paymentDate: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  collectedDate?: string;
  remarks?: string;
};

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentInput & { invoiceId: string }) => api.payments.create(data),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string } & PaymentInput) => api.payments.update(vars.id, vars),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useReturnPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.payments.remove(id),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useUpdatePaymentChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ChequeStatus }) =>
      api.payments.updateChequeStatus(vars.id, vars.status),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}
