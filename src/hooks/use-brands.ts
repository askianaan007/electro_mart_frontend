import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const brandKeys = {
  all: ['brands'] as const,
  lists: () => [...brandKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...brandKeys.lists(), params] as const,
  detail: (id: string) => [...brandKeys.all, 'detail', id] as const,
};

export function useBrands(params: PaginationParams) {
  return useQuery({
    queryKey: brandKeys.list(params),
    queryFn: () => api.brands.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllBrands() {
  return useQuery({
    queryKey: brandKeys.list({ limit: 100 }),
    queryFn: () => api.brands.list({ limit: 100 }),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.brands.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUpdateBrand(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.brands.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.brands.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUploadBrandLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; file: File }) => api.brands.uploadLogo(vars.id, vars.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

export function useUploadBrandImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; file: File }) => api.brands.uploadImage(vars.id, vars.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  });
}
