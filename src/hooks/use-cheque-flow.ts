import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { ChequeFlowFilters, ChequeFlowImportRow, ChequeFlowInput, ChequeFlowStatus } from '@/lib/api/types';

export const chequeFlowKeys = {
  all: ['cheque-flow'] as const,
  list: (params: ChequeFlowFilters & { month?: string }) => [...chequeFlowKeys.all, 'list', params] as const,
  alerts: () => [...chequeFlowKeys.all, 'alerts'] as const,
  monthly: (params: ChequeFlowFilters & { from?: string; to?: string }) =>
    [...chequeFlowKeys.all, 'monthly', params] as const,
  options: () => [...chequeFlowKeys.all, 'options'] as const,
  imports: () => [...chequeFlowKeys.all, 'imports'] as const,
};

export function useChequeFlow(params: ChequeFlowFilters & { month?: string }) {
  return useQuery({
    queryKey: chequeFlowKeys.list(params),
    queryFn: () => api.chequeFlow.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useChequeFlowAlerts() {
  return useQuery({ queryKey: chequeFlowKeys.alerts(), queryFn: () => api.chequeFlow.alerts() });
}

export function useChequeFlowMonthly(params: ChequeFlowFilters & { from?: string; to?: string }) {
  return useQuery({
    queryKey: chequeFlowKeys.monthly(params),
    queryFn: () => api.chequeFlow.monthly(params),
    placeholderData: keepPreviousData,
  });
}

export function useChequeFlowOptions() {
  return useQuery({ queryKey: chequeFlowKeys.options(), queryFn: () => api.chequeFlow.options(), staleTime: 60_000 });
}

export function useChequeFlowImports(enabled: boolean) {
  return useQuery({ queryKey: chequeFlowKeys.imports(), queryFn: () => api.chequeFlow.imports(), enabled });
}

/** Every change refreshes totals, tables, alerts, timeline and chart together. */
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: chequeFlowKeys.all });
}

export function useCreateChequeFlow() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: ChequeFlowInput) => api.chequeFlow.create(data),
    onSuccess: invalidate,
  });
}

export function useUpdateChequeFlow() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ChequeFlowInput> & { id: string }) => api.chequeFlow.update(id, data),
    onSuccess: invalidate,
  });
}

export function useSetChequeFlowStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (vars: { id: string; status: ChequeFlowStatus; clearedDate?: string }) =>
      api.chequeFlow.setStatus(vars.id, vars.status, vars.clearedDate),
    onSuccess: invalidate,
  });
}

export function useDeleteChequeFlow() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.chequeFlow.remove(id), onSuccess: invalidate });
}

export function useRestoreChequeFlow() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.chequeFlow.restore(id), onSuccess: invalidate });
}

export function usePreviewChequeFlowImport() {
  return useMutation({
    mutationFn: (vars: { rows: ChequeFlowImportRow[]; clearedOnChequeDate: boolean }) =>
      api.chequeFlow.previewImport(vars.rows, vars.clearedOnChequeDate),
  });
}

export function useCommitChequeFlowImport() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.chequeFlow.commitImport,
    onSuccess: invalidate,
  });
}

export function useUndoChequeFlowImport() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api.chequeFlow.undoImport(id), onSuccess: invalidate });
}
