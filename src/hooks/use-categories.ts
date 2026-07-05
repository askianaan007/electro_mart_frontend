import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...categoryKeys.lists(), params] as const,
};

export function useCategories(params: PaginationParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => api.categories.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: categoryKeys.list({ limit: 100 }),
    queryFn: () => api.categories.list({ limit: 100 }),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.categories.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.categories.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.categories.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
