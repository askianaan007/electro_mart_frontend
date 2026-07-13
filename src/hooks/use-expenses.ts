import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { equityKeys } from './use-equity';
import type { PaginationParams } from '@/lib/api/types';

export type ExpenseParams = PaginationParams & {
  dateFrom?: string;
  dateTo?: string;
};

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (params: ExpenseParams) => [...expenseKeys.lists(), params] as const,
  detail: (id: string) => [...expenseKeys.all, 'detail', id] as const,
};

export function useExpenses(params: ExpenseParams) {
  return useQuery({
    queryKey: expenseKeys.list(params),
    queryFn: () => api.expenses.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.detail(id ?? ''),
    queryFn: () => api.expenses.get(id as string),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: equityKeys.all });
    },
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.expenses.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: equityKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: equityKeys.all });
    },
  });
}
