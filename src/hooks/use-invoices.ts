import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams, PaymentStatus } from '@/lib/api/types';

type InvoiceParams = PaginationParams & {
  paymentStatus?: PaymentStatus;
  dealerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: InvoiceParams) => [...invoiceKeys.lists(), params] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

export function useInvoices(params: InvoiceParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => api.invoices.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: () => api.invoices.get(id as string),
    enabled: !!id,
  });
}

export function useResetInvoiceCounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.invoices.resetCounter(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}
