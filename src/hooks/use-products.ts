import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import type { PaginationParams } from '@/lib/api/types';

type ProductParams = PaginationParams & { category?: string; status?: string; outOfStockOnly?: boolean };

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

/** Every product matching the filters, across all pages — for pickers. */
export function useAllProducts(params: Omit<ProductParams, 'page' | 'limit'>) {
  return useQuery({
    queryKey: [...productKeys.lists(), 'all', params] as const,
    queryFn: async () => ({
      data: await fetchAllPages((page, limit) => api.products.list({ ...params, page, limit })),
    }),
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
    mutationFn: (vars: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => api.products.setStatus(vars.id, vars.status),
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

export function useUploadProductImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; files: File[] }) => api.products.uploadImages(vars.id, vars.files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useRemoveProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; imageId: string }) => api.products.removeImage(vars.id, vars.imageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
