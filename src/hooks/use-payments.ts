import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { invoiceKeys } from './use-invoices';
import { dealerKeys } from './use-dealers';
import { dashboardKeys } from './use-dashboard';
import type { PaginationParams, PaymentMode } from '@/lib/api/types';

type PaymentParams = PaginationParams & {
  mode?: PaymentMode;
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

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      invoiceId: string;
      amount: number;
      mode: PaymentMode;
      reference?: string;
      paymentDate: string;
    }) => api.payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: dealerKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
