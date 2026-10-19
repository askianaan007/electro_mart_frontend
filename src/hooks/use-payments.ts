import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error';
import { invoiceKeys } from './use-invoices';
import { dealerKeys } from './use-dealers';
import { dashboardKeys } from './use-dashboard';
import type { ChequeStatus, PaginationParams, PaymentMode } from '@/lib/api/types';

type PaymentParams = PaginationParams & {
  mode?: PaymentMode;
  chequeStatus?: ChequeStatus;
  dealerId?: string;
  invoiceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'chequeDate';
};

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params: PaymentParams) => [...paymentKeys.lists(), params] as const,
  detail: (id: string) => [...paymentKeys.all, 'detail', id] as const,
};

export function usePayments(params: PaymentParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => api.payments.list(params),
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => api.payments.get(id as string),
    enabled: !!id,
  });
}

function invalidatePaymentRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
}

type PaymentInput = {
  amount: number;
  mode: PaymentMode;
  reference?: string;
  paymentDate: string;
  bankName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  collectedDate?: string;
  remarks?: string;
};

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    // `confirmDuplicate` is only sent after the user confirms a 409 POSSIBLE_DUPLICATE.
    mutationFn: (data: PaymentInput & { invoiceId: string; confirmDuplicate?: boolean }) =>
      api.payments.create(data),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string } & PaymentInput) => api.payments.update(vars.id, vars),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

export function useReturnPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.payments.remove(id),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}

/** A 409 from undo means the change the user saw was already undone (or superseded). */
function isStaleUndo(error: unknown) {
  return error instanceof ApiError && error.statusCode === 409;
}

export function undoErrorMessage(error: unknown) {
  return isStaleUndo(error) ? 'That change has already been undone — the list has been refreshed.' : getErrorMessage(error);
}

/**
 * Undoes a payment's latest edit / cheque-status change, or restores it if deleted.
 * Pass `revisionId` (the `lastChange.id` the user is looking at) whenever it's
 * known, so a stale or doubled undo is refused instead of undoing an older change.
 */
export function useUndoPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; revisionId?: string }) => api.payments.undo(vars.id, vars.revisionId),
    onSuccess: () => invalidatePaymentRelated(queryClient),
    onError: (error) => {
      if (isStaleUndo(error)) invalidatePaymentRelated(queryClient);
    },
  });
}

export function useDeletedPayments(params: PaginationParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...paymentKeys.all, 'deleted', params] as const,
    queryFn: () => api.payments.listDeleted(params),
    placeholderData: (prev) => prev,
    enabled: options?.enabled,
  });
}

export function useUpdatePaymentChequeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: ChequeStatus }) =>
      api.payments.updateChequeStatus(vars.id, vars.status),
    onSuccess: () => invalidatePaymentRelated(queryClient),
  });
}
