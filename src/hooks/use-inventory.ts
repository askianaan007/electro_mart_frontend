import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { productKeys } from './use-products';
import type { PaginationParams } from '@/lib/api/types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (params: PaginationParams) => [...inventoryKeys.all, 'list', params] as const,
  ledger: (productId: string, params: PaginationParams) =>
    [...inventoryKeys.all, 'ledger', productId, params] as const,
};

export function useInventory(params: PaginationParams) {
  return useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => api.inventory.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useInventoryLedger(productId: string | undefined, params: PaginationParams) {
  return useQuery({
    queryKey: inventoryKeys.ledger(productId ?? '', params),
    queryFn: () => api.inventory.ledger(productId as string, params),
    enabled: !!productId,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; direction: 'IN' | 'OUT'; quantity: number; reason?: string }) =>
      api.inventory.adjust(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
