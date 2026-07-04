import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...supplierKeys.lists(), params] as const,
  detail: (id: string) => [...supplierKeys.all, 'detail', id] as const,
};

export function useSuppliers(params: PaginationParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => api.suppliers.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllSuppliers() {
  return useQuery({
    queryKey: supplierKeys.list({ limit: 100 }),
    queryFn: () => api.suppliers.list({ limit: 100 }),
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? ''),
    queryFn: () => api.suppliers.get(id as string),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.suppliers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.suppliers.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.suppliers.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}
