import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { equityKeys } from './use-equity';
import { liquidCashKeys } from './use-liquid-cash';
import { balanceSheetKeys } from './use-balance-sheet';
import { dashboardKeys } from './use-dashboard';
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

// Expenses reduce Liquid Cash and investor equity, and show on the balance sheet and dashboard.
function invalidateExpenseData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  queryClient.invalidateQueries({ queryKey: equityKeys.all });
  queryClient.invalidateQueries({ queryKey: liquidCashKeys.all });
  queryClient.invalidateQueries({ queryKey: balanceSheetKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.expenses.create(data),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.expenses.update(id, data),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: () => invalidateExpenseData(queryClient),
  });
}
