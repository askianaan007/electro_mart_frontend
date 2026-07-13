import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams } from '@/lib/api/types';

export type SalesAnalysisParams = PaginationParams & {
  dateFrom?: string;
  dateTo?: string;
  dealerId?: string;
};

export const salesAnalysisKeys = {
  all: ['sales-analysis'] as const,
  lists: () => [...salesAnalysisKeys.all, 'list'] as const,
  list: (params: SalesAnalysisParams) => [...salesAnalysisKeys.lists(), params] as const,
  summary: (params: Omit<SalesAnalysisParams, 'page' | 'limit' | 'search'>) =>
    [...salesAnalysisKeys.all, 'summary', params] as const,
};

export function useSalesAnalysis(params: SalesAnalysisParams) {
  return useQuery({
    queryKey: salesAnalysisKeys.list(params),
    queryFn: () => api.salesAnalysis.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useSalesAnalysisSummary(params: { dateFrom?: string; dateTo?: string; dealerId?: string; search?: string }) {
  return useQuery({
    queryKey: salesAnalysisKeys.summary(params),
    queryFn: () => api.salesAnalysis.summary(params),
    placeholderData: (prev) => prev,
  });
}
