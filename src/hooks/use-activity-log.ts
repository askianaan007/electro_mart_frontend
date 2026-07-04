import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export function useActivityLog(params: PaginationParams) {
  return useQuery({
    queryKey: ['activity-log', 'list', params],
    queryFn: () => api.activityLog.list(params),
    placeholderData: (prev) => prev,
  });
}
