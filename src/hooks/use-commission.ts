import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { PaginationParams, PaymentMode, SettlementStatus } from '@/lib/api/types';

export const commissionKeys = {
  all: ['commission'] as const,
  dashboard: () => [...commissionKeys.all, 'dashboard'] as const,
  representativeSummary: (id: string) => [...commissionKeys.all, 'representative-summary', id] as const,
  settlements: () => [...commissionKeys.all, 'settlements'] as const,
  settlementList: (params: PaginationParams & { status?: SettlementStatus; representativeId?: string }) =>
    [...commissionKeys.settlements(), params] as const,
  settlementDetail: (id: string) => [...commissionKeys.settlements(), 'detail', id] as const,
};

export function useCommissionDashboard() {
  return useQuery({
    queryKey: commissionKeys.dashboard(),
    queryFn: () => api.commission.dashboard(),
  });
}

export function useRepresentativeCommissionSummary(id: string | undefined) {
  return useQuery({
    queryKey: commissionKeys.representativeSummary(id ?? ''),
    queryFn: () => api.commission.representativeSummary(id as string),
    enabled: !!id,
  });
}

export function useSettlements(params: PaginationParams & { status?: SettlementStatus; representativeId?: string }) {
  return useQuery({
    queryKey: commissionKeys.settlementList(params),
    queryFn: () => api.commission.settlements(params),
    placeholderData: (prev) => prev,
  });
}

export function useSettlement(id: string | undefined) {
  return useQuery({
    queryKey: commissionKeys.settlementDetail(id ?? ''),
    queryFn: () => api.commission.getSettlement(id as string),
    enabled: !!id,
  });
}

function invalidateSettlements(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: commissionKeys.settlements() });
  queryClient.invalidateQueries({ queryKey: commissionKeys.dashboard() });
  if (id) queryClient.invalidateQueries({ queryKey: commissionKeys.settlementDetail(id) });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { representativeId: string; periodStart: string; periodEnd: string }) =>
      api.commission.createSettlement(data),
    onSuccess: () => invalidateSettlements(queryClient),
  });
}

export function useApproveSettlement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.commission.approveSettlement(id),
    onSuccess: () => invalidateSettlements(queryClient, id),
  });
}

export function useRejectSettlement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.commission.rejectSettlement(id, reason),
    onSuccess: () => invalidateSettlements(queryClient, id),
  });
}

export function usePaySettlement(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { mode: PaymentMode; reference?: string; chequeNumber?: string; bankName?: string; chequeDate?: string }) =>
      api.commission.paySettlement(id, data),
    onSuccess: () => invalidateSettlements(queryClient, id),
  });
}

export function useUpdateSettlementChequeStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: 'CLEARED' | 'RETURNED') => api.commission.updateSettlementChequeStatus(id, status),
    onSuccess: () => invalidateSettlements(queryClient, id),
  });
}
