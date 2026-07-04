import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

type ProductParams = PaginationParams & { category?: string; status?: string; lowStockOnly?: boolean };

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductParams) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(params: ProductParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => api.products.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: () => api.products.get(id as string),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.products.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.products.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useSetProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      api.products.setStatus(vars.id, vars.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.products.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
