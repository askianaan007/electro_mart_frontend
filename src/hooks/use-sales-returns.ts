import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export const salesReturnKeys = {
  all: ['sales-returns'] as const,
  lists: () => [...salesReturnKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...salesReturnKeys.lists(), params] as const,
  detail: (id: string) => [...salesReturnKeys.all, 'detail', id] as const,
};

export function useSalesReturns(params: PaginationParams) {
  return useQuery({
    queryKey: salesReturnKeys.list(params),
    queryFn: () => api.salesReturns.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSalesReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      orderId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) => api.salesReturns.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesReturnKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
