import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { productKeys } from './use-products';
import { inventoryKeys } from './use-inventory';
import { creditKeys } from './use-credits';
import type { PaginationParams } from '@/lib/api/types';

export type PurchaseParams = PaginationParams & { supplierId?: string; dateFrom?: string; dateTo?: string };

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (params: PurchaseParams) => [...purchaseKeys.lists(), params] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

export function usePurchases(params: PurchaseParams) {
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
      transportCharges?: number;
    }) => api.purchases.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePurchase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      supplierId: string;
      invoiceNumber: string;
      purchaseDate: string;
      items: { productId: string; quantity: number; unitCost: number }[];
      transportCharges?: number;
    }) => api.purchases.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.purchases.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: creditKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
