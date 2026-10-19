'use client';

import { FitToWidth } from '@/components/fit-to-width';
import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
import {
  SupplierStatementPrintLayout,
  type StatementPurchaseLine,
  type StatementReturnLine,
  type StatementSettlementLine,
  type StatementTransportLine,
} from '@/components/admin/supplier-statement-print-layout';
import { useSupplier } from '@/hooks/use-suppliers';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { businessToday } from '@/lib/utils';
import { PrintButton } from '@/components/print-button';

// Pure string / UTC arithmetic: local-Date + toISOString shifts the day in
// Sri Lanka (UTC+05:30) — the month end came out a day early and, just after
// midnight, "this month" could still be last month.
function currentMonth() {
  return businessToday().slice(0, 7);
}

function lastDayOfMonth(month: string) {
  const [year, mon] = month.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `${month}-${String(days).padStart(2, '0')}`;
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isBouncedCheque(mode: string, chequeStatus: string | null) {
  return mode === 'CHEQUE' && chequeStatus === 'RETURNED';
}

export default function SupplierStatementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fromMonth = searchParams.get('from') || currentMonth();
  const toMonth = searchParams.get('to') || currentMonth();
  const [draftFrom, setDraftFrom] = useState(fromMonth);
  const [draftTo, setDraftTo] = useState(toMonth);

  const dateFrom = `${fromMonth}-01`;
  const dateTo = lastDayOfMonth(toMonth);

  const {
    data: supplier,
    isLoading: supplierLoading,
    isError: supplierIsError,
    error: supplierError,
    refetch: refetchSupplier,
  } = useSupplier(id);

  const {
    data: purchaseRows,
    isLoading: purchasesLoading,
    isError: purchasesIsError,
    error: purchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ['supplier-statement', 'purchases', id, dateFrom, dateTo],
    queryFn: () =>
      fetchAllPages((page, limit) => api.purchases.list({ supplierId: id, dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });
  const {
    data: returnRows,
    isLoading: returnsLoading,
    isError: returnsIsError,
    error: returnsError,
    refetch: refetchReturns,
  } = useQuery({
    queryKey: ['supplier-statement', 'returns', id, dateFrom, dateTo],
    queryFn: () =>
      fetchAllPages((page, limit) => api.purchaseReturns.list({ supplierId: id, dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });
  const {
    data: settlementRows,
    isLoading: settlementsLoading,
    isError: settlementsIsError,
    error: settlementsError,
    refetch: refetchSettlements,
  } = useQuery({
    queryKey: ['supplier-statement', 'settlements', id, dateFrom, dateTo],
    queryFn: () => fetchAllPages((page, limit) => api.credits.settlements(id, { dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });

  const isLoading = supplierLoading || purchasesLoading || returnsLoading || settlementsLoading;
  const isError = supplierIsError || purchasesIsError || returnsIsError || settlementsIsError;
  const firstError = supplierError ?? purchasesError ?? returnsError ?? settlementsError;
  function retryAll() {
    if (supplierIsError) refetchSupplier();
    if (purchasesIsError) refetchPurchases();
    if (returnsIsError) refetchReturns();
    if (settlementsIsError) refetchSettlements();
  }

  const computed = useMemo(() => {
    const purchases = purchaseRows ?? [];
    const returns = returnRows ?? [];
    const settlements = settlementRows ?? [];

    const purchaseLines: StatementPurchaseLine[] = purchases.flatMap((purchase) =>
      purchase.items.map((item) => ({
        date: purchase.purchaseDate,
        quantity: item.quantity,
        productName: item.product?.name ?? 'Unknown product',
        productDescription: item.product?.description,
        unitPrice: Number(item.unitCost),
        total: Number(item.lineTotal),
      })),
    );
    const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.totalValue), 0);

    const transportLines: StatementTransportLine[] = purchases
      .filter((p) => Number(p.transportCharges) > 0)
      .map((p) => ({ date: p.purchaseDate, invoiceNumber: p.invoiceNumber, amount: Number(p.transportCharges) }));
    const transportTotal = transportLines.reduce((sum, t) => sum + t.amount, 0);

    const returnLines: StatementReturnLine[] = returns.map((r) => ({
      date: r.returnDate,
      returnNumber: r.returnNumber,
      reason: r.reason,
      amount: Number(r.totalAmount),
    }));
    const returnTotal = returnLines.reduce((sum, r) => sum + r.amount, 0);

    const settlementLines: StatementSettlementLine[] = settlements.map((s) => ({
      date: s.paymentDate,
      mode: s.mode.replace('_', ' '),
      reference: s.reference ?? '',
      amount: Number(s.amount),
      chequeStatus: s.chequeStatus,
    }));
    const settlementTotal = settlements
      .filter((s) => !isBouncedCheque(s.mode, s.chequeStatus))
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const netPayable = purchaseTotal - returnTotal - transportTotal;
    const balanceForPeriod = netPayable - settlementTotal;

    return {
      purchaseLines,
      purchaseTotal,
      transportLines,
      transportTotal,
      returnLines,
      returnTotal,
      settlementLines,
      settlementTotal,
      netPayable,
      balanceForPeriod,
    };
  }, [purchaseRows, returnRows, settlementRows]);

  function applyPeriod() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    router.replace(`/admin/suppliers/${id}/statement?from=${draftFrom}&to=${draftTo}`);
  }

  const periodLabel =
    fromMonth === toMonth ? monthLabel(fromMonth) : `${monthLabel(fromMonth)} – ${monthLabel(toMonth)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        title={supplier ? `${supplier.name} statement` : 'Supplier statement'}
        description={`Purchases, returns, transport charges and settlements for ${periodLabel}.`}
        backHref="/admin/suppliers"
        backLabel="Back to Suppliers"
        actions={
          <>
            <Input
              type="month"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="w-auto"
              aria-label="From month"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="month"
              value={draftTo}
              min={draftFrom || undefined}
              max={currentMonth()}
              onChange={(e) => setDraftTo(e.target.value)}
              className="w-auto"
              aria-label="To month"
            />
            <Button variant="outline" onClick={applyPeriod}>
              Update
            </Button>
            <PrintButton variant="default" disabled={isLoading || isError || !supplier} />
          </>
        }
      />

      {isError ? (
        <div className="rounded-xl border border-border bg-card shadow-xs print:hidden">
          <QueryErrorState error={firstError} onRetry={retryAll} title="Couldn't load this statement" />
        </div>
      ) : isLoading || !supplier ? (
        <PageSkeleton cards={0} className="print:hidden" />
      ) : (
        <div className="rounded-xl border border-border bg-muted/40 p-2.5 print:border-0 print:bg-transparent print:p-0 sm:p-8">
          <FitToWidth>
            <SupplierStatementPrintLayout
              supplier={supplier}
              periodLabel={periodLabel}
              generatedDate={new Date().toLocaleDateString('en-GB')}
              {...computed}
            />
          </FitToWidth>
        </div>
      )}
    </div>
  );
}
