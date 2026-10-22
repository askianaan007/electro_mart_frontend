import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { orderKeys } from './use-orders';
import { purchaseKeys } from './use-purchases';
import { invoiceKeys } from './use-invoices';
import type { PaginationParams, ProductUnitCondition, ProductUnitStatus, SerialContext } from '@/lib/api/types';

export type UnitListParams = PaginationParams & {
  productId?: string;
  status?: ProductUnitStatus;
  condition?: ProductUnitCondition;
  purchaseId?: string;
  orderId?: string;
};

export const productUnitKeys = {
  all: ['product-units'] as const,
  list: (params: UnitListParams) => [...productUnitKeys.all, 'list', params] as const,
  detail: (id: string) => [...productUnitKeys.all, 'detail', id] as const,
  coverage: (productId?: string) => [...productUnitKeys.all, 'coverage', productId ?? 'all'] as const,
  scan: (code: string) => [...productUnitKeys.all, 'scan', code] as const,
  orderUnits: (orderId: string) => [...productUnitKeys.all, 'order', orderId] as const,
  validate: (key: unknown) => [...productUnitKeys.all, 'validate', key] as const,
};

// Serial changes show up on orders (badge + annex), invoices (page 2),
// purchases (registered serials) and every unit view.
function invalidateUnitRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: productUnitKeys.all });
  queryClient.invalidateQueries({ queryKey: orderKeys.all });
  queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
}

export function useProductUnits(params: UnitListParams, enabled = true) {
  return useQuery({
    queryKey: productUnitKeys.list(params),
    queryFn: () => api.productUnits.list(params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useProductUnit(id: string | undefined) {
  return useQuery({
    queryKey: productUnitKeys.detail(id ?? ''),
    queryFn: () => api.productUnits.get(id as string),
    enabled: !!id,
  });
}

export function useSerialCoverage(productId?: string, enabled = true) {
  return useQuery({
    queryKey: productUnitKeys.coverage(productId),
    queryFn: () => api.productUnits.coverage(productId),
    enabled,
  });
}

export function useOrderUnits(orderId: string | undefined) {
  return useQuery({
    queryKey: productUnitKeys.orderUnits(orderId ?? ''),
    queryFn: () => api.productUnits.orderUnits(orderId as string),
    enabled: !!orderId,
  });
}

/** Read-only check of a scanned list for a context — no writes. */
export function useValidateSerials(
  input: { productId: string; serials: string[]; context: SerialContext; orderId?: string; purchaseId?: string } | null,
) {
  return useQuery({
    queryKey: productUnitKeys.validate(input),
    queryFn: () => api.productUnits.validate(input!),
    enabled: !!input && !!input.productId && input.serials.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}

export function useScanCode() {
  return useMutation({ mutationFn: (code: string) => api.productUnits.scan(code) });
}

export function useRegisterUnits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.productUnits.register,
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useAssignOrderUnits(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { lines: { productId: string; serials: string[] }[]; idempotencyKey: string }) =>
      api.productUnits.assignOrderUnits(orderId, data),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useUpdateUnit(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.productUnits.update>[1]) => api.productUnits.update(id, data),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useRemoveUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.productUnits.remove(id),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useSetUnitCondition(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { condition: ProductUnitCondition; reason: string }) => api.productUnits.setCondition(id, data),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useWarrantySwap(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.productUnits.warrantySwap>[1]) => api.productUnits.warrantySwap(id, data),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}

export function useSupplierReplacement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.productUnits.supplierReplacement>[1]) =>
      api.productUnits.supplierReplacement(id, data),
    onSuccess: () => invalidateUnitRelated(queryClient),
  });
}
