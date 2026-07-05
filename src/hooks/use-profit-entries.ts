import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const profitEntryKeys = {
  all: ['profit-entries'] as const,
  lists: () => [...profitEntryKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...profitEntryKeys.lists(), params] as const,
  detail: (id: string) => [...profitEntryKeys.all, 'detail', id] as const,
};

export function useProfitEntries(params: PaginationParams) {
  return useQuery({
    queryKey: profitEntryKeys.list(params),
    queryFn: () => api.profitEntries.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProfitEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.profitEntries.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profitEntryKeys.all }),
  });
}

export function useUpdateProfitEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.profitEntries.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profitEntryKeys.all }),
  });
}

export function useDeleteProfitEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.profitEntries.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profitEntryKeys.all }),
  });
}
