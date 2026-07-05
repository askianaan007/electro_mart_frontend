import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const investmentKeys = {
  all: ['investments'] as const,
  lists: () => [...investmentKeys.all, 'list'] as const,
  list: (params: PaginationParams & { investorId?: string }) => [...investmentKeys.lists(), params] as const,
  detail: (id: string) => [...investmentKeys.all, 'detail', id] as const,
};

export function useInvestments(params: PaginationParams & { investorId?: string }) {
  return useQuery({
    queryKey: investmentKeys.list(params),
    queryFn: () => api.investments.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvestment(id: string | undefined) {
  return useQuery({
    queryKey: investmentKeys.detail(id ?? ''),
    queryFn: () => api.investments.get(id as string),
    enabled: !!id,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investments.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all }),
  });
}

export function useUpdateInvestment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.investments.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all }),
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.investments.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: investmentKeys.all }),
  });
}
