import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { AssignmentScopeType, PaginationParams } from '@/lib/api/types';

export const representativeKeys = {
  all: ['representatives'] as const,
  lists: () => [...representativeKeys.all, 'list'] as const,
  list: (params: PaginationParams & { status?: string }) => [...representativeKeys.lists(), params] as const,
  detail: (id: string) => [...representativeKeys.all, 'detail', id] as const,
  loginHistory: (id: string, params: PaginationParams) => [...representativeKeys.detail(id), 'login-history', params] as const,
  activityLog: (id: string, params: PaginationParams) => [...representativeKeys.detail(id), 'activity-log', params] as const,
  salesStats: (id: string) => [...representativeKeys.detail(id), 'sales-stats'] as const,
  commissionStats: (id: string) => [...representativeKeys.detail(id), 'commission-stats'] as const,
  settlements: (id: string, params: PaginationParams) => [...representativeKeys.detail(id), 'settlements', params] as const,
  assignedProducts: (id: string) => [...representativeKeys.detail(id), 'assigned-products'] as const,
  assignedBanners: (id: string) => [...representativeKeys.detail(id), 'assigned-banners'] as const,
  assignedCustomers: (id: string, params: PaginationParams) => [...representativeKeys.detail(id), 'assigned-customers', params] as const,
};

export function useRepresentatives(params: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: representativeKeys.list(params),
    queryFn: () => api.representatives.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllRepresentatives() {
  return useQuery({
    queryKey: representativeKeys.list({ limit: 100 }),
    queryFn: () => api.representatives.list({ limit: 100 }),
  });
}

export function useRepresentative(id: string | undefined) {
  return useQuery({
    queryKey: representativeKeys.detail(id ?? ''),
    queryFn: () => api.representatives.get(id as string),
    enabled: !!id,
  });
}

export function useCreateRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.representatives.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: representativeKeys.lists() }),
  });
}

export function useUpdateRepresentative(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.representatives.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: representativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: representativeKeys.detail(id) });
    },
  });
}

export function useSetRepresentativeStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => api.representatives.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: representativeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: representativeKeys.detail(id) });
    },
  });
}

export function useResetRepresentativePassword() {
  return useMutation({
    mutationFn: (id: string) => api.representatives.resetPassword(id),
  });
}

export function useForceRepresentativePasswordChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.representatives.forcePasswordChange(id),
    onSuccess: (_data, id) => queryClient.invalidateQueries({ queryKey: representativeKeys.detail(id) }),
  });
}

export function useUnlockRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.representatives.unlock(id),
    onSuccess: (_data, id) => queryClient.invalidateQueries({ queryKey: representativeKeys.detail(id) }),
  });
}

export function useDeleteRepresentative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.representatives.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: representativeKeys.lists() }),
  });
}

export function useRepresentativeLoginHistory(id: string, params: PaginationParams) {
  return useQuery({
    queryKey: representativeKeys.loginHistory(id, params),
    queryFn: () => api.representatives.loginHistory(id, params),
    placeholderData: (prev) => prev,
  });
}

export function useRepresentativeActivityLog(id: string, params: PaginationParams) {
  return useQuery({
    queryKey: representativeKeys.activityLog(id, params),
    queryFn: () => api.representatives.activityLog(id, params),
    placeholderData: (prev) => prev,
  });
}

export function useClearRepresentativeActivityLog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.representatives.clearActivityLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: representativeKeys.activityLog(id, {}) }),
  });
}

export function useRepresentativeSalesStats(id: string | undefined) {
  return useQuery({
    queryKey: representativeKeys.salesStats(id ?? ''),
    queryFn: () => api.representatives.salesStats(id as string),
    enabled: !!id,
  });
}

export function useRepresentativeCommissionStats(id: string | undefined) {
  return useQuery({
    queryKey: representativeKeys.commissionStats(id ?? ''),
    queryFn: () => api.representatives.commissionStats(id as string),
    enabled: !!id,
  });
}

export function useRepresentativeSettlements(id: string, params: PaginationParams) {
  return useQuery({
    queryKey: representativeKeys.settlements(id, params),
    queryFn: () => api.representatives.settlements(id, params),
    placeholderData: (prev) => prev,
  });
}

export function useRepresentativeAssignedProducts(id: string) {
  return useQuery({
    queryKey: representativeKeys.assignedProducts(id),
    queryFn: () => api.representatives.assignedProducts(id),
  });
}

export function useAssignProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { scopeType: AssignmentScopeType; scopeValue: string }) =>
      api.representatives.assignProduct(id, vars.scopeType, vars.scopeValue),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: representativeKeys.assignedProducts(id) }),
  });
}

export function useRemoveProductAssignment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api.representatives.removeProductAssignment(id, assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: representativeKeys.assignedProducts(id) }),
  });
}

export function useRepresentativeAssignedBanners(id: string) {
  return useQuery({
    queryKey: representativeKeys.assignedBanners(id),
    queryFn: () => api.representatives.assignedBanners(id),
  });
}

export function useRepresentativeAssignedCustomers(id: string, params: PaginationParams) {
  return useQuery({
    queryKey: representativeKeys.assignedCustomers(id, params),
    queryFn: () => api.representatives.assignedCustomers(id, params),
    placeholderData: (prev) => prev,
  });
}
