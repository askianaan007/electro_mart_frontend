import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const dealerKeys = {
  all: ['dealers'] as const,
  lists: () => [...dealerKeys.all, 'list'] as const,
  list: (params: PaginationParams & { status?: string }) => [...dealerKeys.lists(), params] as const,
  detail: (id: string) => [...dealerKeys.all, 'detail', id] as const,
};

export function useDealers(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: dealerKeys.list(params),
    queryFn: () => api.dealers.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useDealer(id: string | undefined) {
  return useQuery({
    queryKey: dealerKeys.detail(id ?? ''),
    queryFn: () => api.dealers.get(id as string),
    enabled: !!id,
  });
}

export function useCreateDealer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.dealers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dealerKeys.lists() }),
  });
}

export function useUpdateDealer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.dealers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.detail(id) });
    },
  });
}

export function useSetDealerStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: 'ACTIVE' | 'INACTIVE') => api.dealers.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.detail(id) });
    },
  });
}
