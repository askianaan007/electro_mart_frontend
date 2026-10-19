import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { liquidCashKeys } from './use-liquid-cash';
import { balanceSheetKeys } from './use-balance-sheet';
import { dashboardKeys } from './use-dashboard';
import type { PaginationParams } from '@/lib/api/types';

export type CreateCashAdjustmentInput = Parameters<typeof api.cashAdjustments.create>[0];
export type ReverseCashAdjustmentInput = Parameters<typeof api.cashAdjustments.reverse>[1];

export const cashAdjustmentKeys = {
  all: ['cash-adjustments'] as const,
  lists: () => [...cashAdjustmentKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...cashAdjustmentKeys.lists(), params] as const,
};

export function useCashAdjustments(params: PaginationParams) {
  return useQuery({
    queryKey: cashAdjustmentKeys.list(params),
    queryFn: () => api.cashAdjustments.list(params),
    placeholderData: (prev) => prev,
  });
}

/** Adjustments move the cash balance, so everything that reads it is refreshed. */
function useInvalidateCashViews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: cashAdjustmentKeys.all });
    queryClient.invalidateQueries({ queryKey: liquidCashKeys.all });
    queryClient.invalidateQueries({ queryKey: balanceSheetKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };
}

export function useCreateCashAdjustment() {
  const invalidate = useInvalidateCashViews();
  return useMutation({
    mutationFn: (data: CreateCashAdjustmentInput) => api.cashAdjustments.create(data),
    onSuccess: invalidate,
  });
}

export function useReverseCashAdjustment() {
  const invalidate = useInvalidateCashViews();
  return useMutation({
    mutationFn: ({ id, ...data }: ReverseCashAdjustmentInput & { id: string }) => api.cashAdjustments.reverse(id, data),
    onSuccess: invalidate,
  });
}
