import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { dealerKeys } from './use-dealers';
import { invoiceKeys } from './use-invoices';
import { orderKeys } from './use-orders';
import { paymentKeys } from './use-payments';
import { refundKeys } from './use-refunds';

// Under dealerKeys.all, so anything that refreshes dealers (payments, returns) refreshes the wallet too.
export const walletKeys = {
  detail: (dealerId: string) => [...dealerKeys.all, 'wallet', dealerId] as const,
};

export function useDealerWallet(dealerId: string | undefined) {
  return useQuery({
    queryKey: walletKeys.detail(dealerId ?? ''),
    queryFn: () => api.dealers.wallet(dealerId as string),
    enabled: !!dealerId,
  });
}

function invalidateWalletRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: dealerKeys.all });
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: orderKeys.all });
  queryClient.invalidateQueries({ queryKey: paymentKeys.all });
  queryClient.invalidateQueries({ queryKey: refundKeys.all });
}

export function useUseWalletCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { invoiceId: string; amount: number; note?: string }) =>
      api.invoices.useWalletCredit(vars.invoiceId, { amount: vars.amount, note: vars.note }),
    onSuccess: () => invalidateWalletRelated(queryClient),
  });
}

export function useRemoveWalletCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (useId: string) => api.invoices.removeWalletCredit(useId),
    onSuccess: () => invalidateWalletRelated(queryClient),
  });
}
