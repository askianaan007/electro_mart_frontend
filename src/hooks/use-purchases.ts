import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { productKeys } from './use-products';
import { inventoryKeys } from './use-inventory';
import type { PaginationParams } from '@/lib/api/types';

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...purchaseKeys.lists(), params] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

export function usePurchases(params: PaginationParams) {
  return useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn: () => api.purchases.list(params),
    placeholderData: (prev) => prev,
  });
}

export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: purchaseKeys.detail(id ?? ''),
    queryFn: () => api.purchases.get(id as string),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      supplierId: string;
      invoiceNumber: string;
      purchaseDate: string;
      items: { productId: string; quantity: number; unitCost: number }[];
    }) => api.purchases.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
