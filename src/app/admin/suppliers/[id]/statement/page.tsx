'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function lastDayOfMonth(month: string) {
  const [year, mon] = month.split('-').map(Number);
  const last = new Date(year, mon, 0);
  return last.toISOString().slice(0, 10);
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

  const { data: supplier, isLoading: supplierLoading } = useSupplier(id);

  const { data: purchaseRows, isLoading: purchasesLoading } = useQuery({
    queryKey: ['supplier-statement', 'purchases', id, dateFrom, dateTo],
    queryFn: () =>
      fetchAllPages((page, limit) => api.purchases.list({ supplierId: id, dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });
  const { data: returnRows, isLoading: returnsLoading } = useQuery({
    queryKey: ['supplier-statement', 'returns', id, dateFrom, dateTo],
    queryFn: () =>
      fetchAllPages((page, limit) => api.purchaseReturns.list({ supplierId: id, dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });
  const { data: settlementRows, isLoading: settlementsLoading } = useQuery({
    queryKey: ['supplier-statement', 'settlements', id, dateFrom, dateTo],
    queryFn: () => fetchAllPages((page, limit) => api.credits.settlements(id, { dateFrom, dateTo, page, limit })),
    enabled: !!id,
  });

  const isLoading = supplierLoading || purchasesLoading || returnsLoading || settlementsLoading;

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

  const periodLabel = fromMonth === toMonth ? monthLabel(fromMonth) : `${monthLabel(fromMonth)} – ${monthLabel(toMonth)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/suppliers')} className="-ml-2 shrink-0">
          <ArrowLeft />
          Back to Suppliers
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="month"
            value={draftTo}
            min={draftFrom || undefined}
            max={currentMonth()}
            onChange={(e) => setDraftTo(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={applyPeriod}>
            Update
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      {isLoading || !supplier ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 print:overflow-visible print:bg-transparent print:p-0 sm:p-8">
          <SupplierStatementPrintLayout
            supplier={supplier}
            periodLabel={periodLabel}
            generatedDate={new Date().toLocaleDateString('en-GB')}
            {...computed}
          />
        </div>
      )}
    </div>
  );
}
