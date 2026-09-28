import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { purchaseKeys } from './use-purchases';
import { inventoryKeys } from './use-inventory';
import { creditKeys } from './use-credits';
import { creditBalanceKeys } from './use-credit-balance';
import { balanceSheetKeys } from './use-balance-sheet';
import type { PaginationParams } from '@/lib/api/types';

export type PurchaseReturnParams = PaginationParams & { supplierId?: string; dateFrom?: string; dateTo?: string };

export const purchaseReturnKeys = {
  all: ['purchase-returns'] as const,
  lists: () => [...purchaseReturnKeys.all, 'list'] as const,
  list: (params: PurchaseReturnParams) => [...purchaseReturnKeys.lists(), params] as const,
  byPurchase: (purchaseId: string) => [...purchaseReturnKeys.all, 'by-purchase', purchaseId] as const,
  replacements: (purchaseReturnId: string) =>
    [...purchaseReturnKeys.all, 'replacements', purchaseReturnId] as const,
};

export function usePurchaseReturns(params: PurchaseReturnParams) {
  return useQuery({
    queryKey: purchaseReturnKeys.list(params),
    queryFn: () => api.purchaseReturns.list(params),
    placeholderData: (prev) => prev,
  });
}

export function usePurchaseReturn(id: string | undefined) {
  return useQuery({
    queryKey: [...purchaseReturnKeys.all, 'detail', id ?? ''] as const,
    queryFn: () => api.purchaseReturns.get(id as string),
    enabled: !!id,
  });
}

export function usePurchaseReturnsForPurchase(purchaseId: string | undefined) {
  return useQuery({
    queryKey: purchaseReturnKeys.byPurchase(purchaseId ?? ''),
    queryFn: () => api.purchaseReturns.listForPurchase(purchaseId as string),
    enabled: !!purchaseId,
  });
}

// A return (or a replacement receipt against one) touches stock, the
// purchase it's tied to (if any), the supplier's credit balance, and every
// figure derived from those — invalidate broadly rather than guessing which
// slice of state is stale. Shared by every return/receipt mutation since
// they all have the same blast radius.
function invalidatePurchaseReturnRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.all });
  queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: creditKeys.all });
  queryClient.invalidateQueries({ queryKey: creditBalanceKeys.all });
  queryClient.invalidateQueries({ queryKey: balanceSheetKeys.all });
  queryClient.invalidateQueries({ queryKey: ['supplier-statement'] });
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

export function useReplacementReceipts(purchaseReturnId: string | undefined) {
  return useQuery({
    queryKey: purchaseReturnKeys.replacements(purchaseReturnId ?? ''),
    queryFn: () => api.replacementReceipts.listForReturn(purchaseReturnId as string),
    enabled: !!purchaseReturnId,
  });
}

/**
 * Receive replacement goods for a return. The caller passes an
 * idempotencyKey generated once per dialog session so a retry after a
 * timeout, or a double-click, can't receive the goods twice.
 */
export function useCreateReplacementReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      purchaseReturnId,
      ...data
    }: {
      purchaseReturnId: string;
      idempotencyKey: string;
      receivedDate: string;
      reference?: string;
      notes?: string;
      items: { purchaseReturnItemId: string; quantity: number }[];
    }) => api.replacementReceipts.create(purchaseReturnId, data),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}

/**
 * Correct a mistaken receipt (count, return line / product, date, ref) —
 * only within 1 day of recording it (enforced server-side). Stock, receipt
 * value and supplier balance all follow from the corrected lines.
 */
export function useUpdateReplacementReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      receivedDate: string;
      reference?: string;
      notes?: string;
      items: { purchaseReturnItemId: string; quantity: number }[];
    }) => api.replacementReceipts.update(id, data),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}

/** Void a mistaken receipt — only within 1 day of recording it (enforced server-side). */
export function useVoidReplacementReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.replacementReceipts.void(id),
    onSuccess: () => invalidatePurchaseReturnRelated(queryClient),
  });
}
