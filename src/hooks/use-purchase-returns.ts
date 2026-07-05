import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const purchaseReturnKeys = {
  all: ['purchase-returns'] as const,
  lists: () => [...purchaseReturnKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...purchaseReturnKeys.lists(), params] as const,
  byPurchase: (purchaseId: string) => [...purchaseReturnKeys.all, 'by-purchase', purchaseId] as const,
};

export function usePurchaseReturns(params: PaginationParams) {
  return useQuery({
    queryKey: purchaseReturnKeys.list(params),
    queryFn: () => api.purchaseReturns.list(params),
    placeholderData: (prev) => prev,
  });
}

export function usePurchaseReturnsForPurchase(purchaseId: string | undefined) {
  return useQuery({
    queryKey: purchaseReturnKeys.byPurchase(purchaseId ?? ''),
    queryFn: () => api.purchaseReturns.listForPurchase(purchaseId as string),
    enabled: !!purchaseId,
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      purchaseId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) => api.purchaseReturns.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.all });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
