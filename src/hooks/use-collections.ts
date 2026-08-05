import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { CollectionStatus, PaginationParams } from '@/lib/api/types';

export const collectionKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: (params: PaginationParams & { status?: CollectionStatus; representativeId?: string }) =>
    [...collectionKeys.lists(), params] as const,
  detail: (id: string) => [...collectionKeys.all, 'detail', id] as const,
};

export function useCollections(params: PaginationParams & { status?: CollectionStatus; representativeId?: string }) {
  return useQuery({
    queryKey: collectionKeys.list(params),
    queryFn: () => api.collections.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: collectionKeys.detail(id ?? ''),
    queryFn: () => api.collections.get(id as string),
    enabled: !!id,
  });
}

export function useConfirmCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; invoiceId?: string }) => api.collections.confirm(vars.id, vars.invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) => api.collections.reject(vars.id, vars.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}
