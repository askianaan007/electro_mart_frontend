import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export type ActivityLogParams = PaginationParams & {
  action?: string;
  adminId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useActivityLog(params: ActivityLogParams) {
  return useQuery({
    queryKey: ['activity-log', 'list', params],
    queryFn: () => api.activityLog.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useActivityLogAdmins() {
  return useQuery({
    queryKey: ['activity-log', 'admins'],
    queryFn: () => api.activityLog.admins(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useClearActivityLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.activityLog.clearAll(password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activity-log'] }),
  });
}
