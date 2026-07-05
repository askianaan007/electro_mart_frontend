import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const investorKeys = {
  all: ['investors'] as const,
  lists: () => [...investorKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...investorKeys.lists(), params] as const,
  detail: (id: string) => [...investorKeys.all, 'detail', id] as const,
};

export function useInvestors(params: PaginationParams) {
  return useQuery({
    queryKey: investorKeys.list(params),
    queryFn: () => api.investors.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllInvestors() {
  return useQuery({
    queryKey: investorKeys.list({ limit: 100 }),
    queryFn: () => api.investors.list({ limit: 100 }),
  });
}

export function useInvestor(id: string | undefined) {
  return useQuery({
    queryKey: investorKeys.detail(id ?? ''),
    queryFn: () => api.investors.get(id as string),
    enabled: !!id,
  });
}

export function useCreateInvestor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investors.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investorKeys.all }),
  });
}

export function useUpdateInvestor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investors.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investorKeys.all }),
  });
}

export function useDeleteInvestor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.investors.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investorKeys.all }),
  });
}
