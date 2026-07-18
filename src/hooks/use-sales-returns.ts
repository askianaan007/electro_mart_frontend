import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { orderKeys } from './use-orders';
import { invoiceKeys } from './use-invoices';
import { paymentKeys } from './use-payments';
import { productKeys } from './use-products';
import { inventoryKeys } from './use-inventory';
import { dealerKeys } from './use-dealers';
import type { PaginationParams } from '@/lib/api/types';

export const salesReturnKeys = {
  all: ['sales-returns'] as const,
  lists: () => [...salesReturnKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...salesReturnKeys.lists(), params] as const,
  byOrder: (orderId: string) => [...salesReturnKeys.all, 'by-order', orderId] as const,
  detail: (id: string) => [...salesReturnKeys.all, 'detail', id] as const,
};

export function useSalesReturns(params: PaginationParams) {
  return useQuery({
    queryKey: salesReturnKeys.list(params),
    queryFn: () => api.salesReturns.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useSalesReturnsForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: salesReturnKeys.byOrder(orderId ?? ''),
    queryFn: () => api.salesReturns.byOrder(orderId as string),
    enabled: !!orderId,
  });
}

// A return touches stock, the order/invoice it was recorded against, the
// dealer's balance (possibly into credit), and every dashboard figure
// derived from sales — invalidate broadly rather than guessing which slice
// of state is stale. Shared by create/update/delete since all three have
// the same blast radius.
function invalidateSalesReturnRelated(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
) {
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.all });
  queryClient.invalidateQueries({ queryKey: salesReturnKeys.byOrder(orderId) });
  queryClient.invalidateQueries({ queryKey: orderKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  queryClient.invalidateQueries({ queryKey: productKeys.all });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orderId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) => api.salesReturns.create(data),
    onSuccess: (_result, variables) => invalidateSalesReturnRelated(queryClient, variables.orderId),
  });
}

export function useUpdateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      orderId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) =>
      api.salesReturns.update(data.id, {
        reason: data.reason,
        returnDate: data.returnDate,
        items: data.items,
      }),
    onSuccess: (_result, variables) => invalidateSalesReturnRelated(queryClient, variables.orderId),
  });
}

export function useDeleteSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; orderId: string }) => api.salesReturns.remove(data.id),
    onSuccess: (_result, variables) => invalidateSalesReturnRelated(queryClient, variables.orderId),
  });
}
