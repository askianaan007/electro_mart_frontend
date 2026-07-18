import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { purchaseKeys } from './use-purchases';
import { inventoryKeys } from './use-inventory';
import { creditKeys } from './use-credits';
import type { PaginationParams } from '@/lib/api/types';

export type PurchaseReturnParams = PaginationParams & { supplierId?: string; dateFrom?: string; dateTo?: string };

export const purchaseReturnKeys = {
  all: ['purchase-returns'] as const,
  lists: () => [...purchaseReturnKeys.all, 'list'] as const,
  list: (params: PurchaseReturnParams) => [...purchaseReturnKeys.lists(), params] as const,
  byPurchase: (purchaseId: string) => [...purchaseReturnKeys.all, 'by-purchase', purchaseId] as const,
};

export function usePurchaseReturns(params: PurchaseReturnParams) {
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

// A return touches stock, the purchase it's tied to (if any), the
// supplier's credit balance, and dashboard figures derived from purchases —
// invalidate broadly rather than guessing which slice of state is stale.
// Shared by create/update/delete since all three have the same blast radius.
function invalidatePurchaseReturnRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.all });
  queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: creditKeys.all });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      purchaseId?: string;
      supplierId?: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number; unitCost?: number }[];
    }) => api.purchaseReturns.create(data),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}

/**
 * Correct a mistaken return's items/reason/date — only allowed within 1
 * day of being recorded (enforced server-side; mirrored client-side via
 * canEditPurchaseReturn).
 */
export function useUpdatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number; unitCost?: number }[];
    }) =>
      api.purchaseReturns.update(data.id, {
        reason: data.reason,
        returnDate: data.returnDate,
        items: data.items,
      }),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}

export function useDeletePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.purchaseReturns.remove(id),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}
