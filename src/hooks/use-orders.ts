import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { productKeys } from './use-products';
import { inventoryKeys } from './use-inventory';
import { dealerKeys } from './use-dealers';
import { invoiceKeys } from './use-invoices';
import { dashboardKeys } from './use-dashboard';
import type { OrderStatus, PaginationParams } from '@/lib/api/types';

type OrderParams = PaginationParams & {
  status?: OrderStatus;
  dealerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// Per-line discount is mutually exclusive with the order-wide discount —
// enforced by the backend, mirrored here for the request shape.
type OrderItemInput = {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  discountAmount?: number;
};

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: OrderParams) => [...orderKeys.lists(), params] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export function useOrders(params: OrderParams) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => api.orders.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: () => api.orders.get(id as string),
    enabled: !!id,
  });
}

function invalidateOrderRelated(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  if (id) queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
  queryClient.invalidateQueries({ queryKey: productKeys.all });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dealerId?: string;
      items: OrderItemInput[];
      discountPercentage?: number;
      discountAmount?: number;
      saleDate?: string;
    }) => api.orders.create(data),
    onSuccess: () => invalidateOrderRelated(queryClient),
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; discountPercentage?: number; discountAmount?: number }) =>
      api.orders.approve(vars.id, {
        discountPercentage: vars.discountPercentage,
        discountAmount: vars.discountAmount,
      }),
    onSuccess: (_data, vars) => invalidateOrderRelated(queryClient, vars.id),
  });
}

export function useRejectOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) => api.orders.reject(vars.id, vars.reason),
    onSuccess: (_data, vars) => invalidateOrderRelated(queryClient, vars.id),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: 'PACKED' | 'DELIVERED' | 'COMPLETED' }) =>
      api.orders.updateStatus(vars.id, vars.status),
    onSuccess: (_data, vars) => invalidateOrderRelated(queryClient, vars.id),
  });
}

export function useCompleteOrderDirectly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.orders.completeDirectly(id),
    onSuccess: (_data, id) => invalidateOrderRelated(queryClient, id),
  });
}

export function useUpdateOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      dealerId: string;
      items: OrderItemInput[];
      discountPercentage?: number;
      discountAmount?: number;
      saleDate?: string;
    }) => api.orders.update(id, data),
    onSuccess: () => invalidateOrderRelated(queryClient, id),
  });
}

export function useUpdateOrderItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; items: { productId: string; quantity: number }[] }) =>
      api.orders.updateItems(vars.id, vars.items),
    onSuccess: (_data, vars) => invalidateOrderRelated(queryClient, vars.id),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.orders.remove(id),
    onSuccess: (_data, id) => invalidateOrderRelated(queryClient, id),
  });
}

export function useResetOrderCounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.orders.resetCounter(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
