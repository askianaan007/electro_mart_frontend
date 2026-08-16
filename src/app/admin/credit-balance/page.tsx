'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Clock,
  Download,
  FileDown,
  HandCoins,
  Loader2,
  Package,
  Search,
  Truck,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useCreditBalanceSummary, useCreditBalanceHistory } from '@/hooks/use-credit-balance';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { downloadCsv } from '@/lib/csv';
import { downloadCreditBalanceStatementPdf } from '@/lib/credit-balance-pdf';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { CreditBalanceEntryType, CreditBalanceHistoryEntry } from '@/lib/api/types';

type TypeFilter = 'all' | CreditBalanceEntryType;
type StatusKey = 'PENDING' | 'CLEARED' | 'RETURNED';

const EXPORT_CAP = 10_000;

const TYPE_META: Record<CreditBalanceEntryType, { label: string; icon: typeof Package; tone: string }> = {
  PURCHASE: { label: 'Purchase', icon: Package, tone: 'text-primary' },
  TRANSPORT_CHARGE: { label: 'Transport Charge', icon: Truck, tone: 'text-destructive' },
  PURCHASE_RETURN: { label: 'Purchase Return', icon: Undo2, tone: 'text-destructive' },
  SETTLEMENT: { label: 'Settlement', icon: HandCoins, tone: 'text-destructive' },
};

const STATUS_META: Record<StatusKey, { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  RETURNED: { label: 'Returned', variant: 'destructive' },
};

/** Animates from the previous value to `target` with an ease-out curve — the "futuristic" count-up on the headline balance. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

function downloadHistoryCsv(filename: string, rows: CreditBalanceHistoryEntry[]) {
  const header = ['Date', 'Type', 'Status', 'Description', 'Mode', 'Previous Balance', 'Amount', 'Balance After'];
  downloadCsv(
    filename,
    header,
    rows.map((row) => [
      formatDate(row.date),
      TYPE_META[row.type].label,
      row.status ?? '',
      row.description,
      row.mode ? row.mode.replace('_', ' ') : '',
      Number(row.balanceBefore),
      Number(row.faceAmount),
      Number(row.balanceAfter),
    ]),
  );
}

export default function CreditBalancePage() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErrorObj, refetch: refetchSummary } =
    useCreditBalanceSummary();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || typeFilter !== 'all' || !!dateFrom || !!dateTo;

  const historyFilters = {
    search: debouncedSearch || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const {
    data: historyResult,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    error: historyErrorObj,
    refetch: refetchHistory,
  } = useCreditBalanceHistory({ page, limit: 20, ...historyFilters });

  const history = historyResult?.data ?? [];
  const animatedBalance = useCountUp(summary ? summary.balance : 0);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function filterSummaryLabel() {
    const parts: string[] = [];
    if (typeFilter !== 'all') parts.push(TYPE_META[typeFilter].label);
    if (dateFrom || dateTo) parts.push(`${dateFrom || 'start'} to ${dateTo || 'now'}`);
    if (debouncedSearch) parts.push(`search "${debouncedSearch}"`);
    return parts.length > 0 ? parts.join(' · ') : 'All transactions';
  }

  async function handleExportCsv() {
    if (!historyResult) return;
    if (historyResult.meta.total > EXPORT_CAP) {
      setExportError(`This filter matches ${historyResult.meta.total.toLocaleString()} rows. Narrow the date range to under ${EXPORT_CAP.toLocaleString()} before exporting.`);
      return;
    }
    setExportError(null);
    setIsExportingCsv(true);
    try {
      const allRows = await fetchAllPages((p, limit) => api.creditBalance.history({ ...historyFilters, page: p, limit }));
      downloadHistoryCsv(`credit-balance-history-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleExportPdf() {
    if (!historyResult || !summary) return;
    if (historyResult.meta.total > EXPORT_CAP) {
      setExportError(`This filter matches ${historyResult.meta.total.toLocaleString()} rows. Narrow the date range to under ${EXPORT_CAP.toLocaleString()} before exporting.`);
      return;
    }
    setExportError(null);
    setIsExportingPdf(true);
    try {
      const allRows = await fetchAllPages((p, limit) => api.creditBalance.history({ ...historyFilters, page: p, limit }));
      await downloadCreditBalanceStatementPdf(`credit-balance-statement-${new Date().toISOString().slice(0, 10)}.pdf`, allRows, {
        filterSummary: filterSummaryLabel(),
        dateFrom,
        dateTo,
        summary,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HandCoins className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Credit Balance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every event that changes what&apos;s owed to suppliers — purchases, transport charges, returns, and
              settlements — with a running balance so you can see exactly how the current figure was reached.
            </p>
          </div>
        </div>
        <Link href="/admin/dashboard" className="shrink-0">
          <Button variant="ghost" size="sm">
            <ArrowLeft />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Headline balance — futuristic gradient card with animated count-up */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-destructive/10 blur-3xl" />
        <div className="relative flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Current Credit Balance</p>
          {summaryLoading ? (
            <Skeleton className="h-11 w-64" />
          ) : summaryError ? (
            <QueryErrorState error={summaryErrorObj} onRetry={() => refetchSummary()} className="items-start py-0 text-left" />
          ) : (
            <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {formatCurrency(animatedBalance)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Purchases − transport charges − purchase returns − settlements paid, all-time.
          </p>
        </div>
      </section>

      {/* Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Payable Flow Breakdown</h2>
        </div>

        {summaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
            <Skeleton className="h-44 rounded-2xl md:col-span-2" />
          </div>
        ) : summaryError ? null : (
          summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* 1. Purchases */}
              <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-card to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-md">
                <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-blue-500/10 blur-2xl transition-all duration-300 group-hover:bg-blue-500/20" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-inner">
                    <Package className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <ArrowUpRight className="size-3" /> ADDS TO BALANCE
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchases</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {formatCurrency(summary.totalPurchases)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-blue-500/15 pt-3 text-xs text-muted-foreground">
                  <span>Goods bought on credit</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">All-Time Purchases</span>
                </div>
              </div>

              {/* 2. Settlements Paid */}
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-md">
                <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-300 group-hover:bg-emerald-500/20" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-inner">
                    <HandCoins className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <ArrowDownLeft className="size-3" /> REDUCES BALANCE
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settlements Paid</p>
                  <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-3xl">
                    −{formatCurrency(summary.totalSettled)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-emerald-500/15 pt-3 text-xs text-muted-foreground">
                  <span>Cash, bank &amp; cheque settlements</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Debt Paid Down</span>
                </div>
              </div>

              {/* 3. Purchase Returns */}
              <div className="group relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-card to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-md">
                <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-teal-500/10 blur-2xl transition-all duration-300 group-hover:bg-teal-500/20" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 shadow-inner">
                    <Undo2 className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                    <ArrowDownLeft className="size-3" /> REDUCES BALANCE
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchase Returns</p>
                  <p className="text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400 sm:text-3xl">
                    −{formatCurrency(summary.totalReturns)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-teal-500/15 pt-3 text-xs text-muted-foreground">
                  <span>Goods sent back to suppliers</span>
                  <span className="font-medium text-teal-600 dark:text-teal-400">Credited Back</span>
                </div>
              </div>

              {/* 4. Transport Charges */}
              <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-card to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-md">
                <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-cyan-500/10 blur-2xl transition-all duration-300 group-hover:bg-cyan-500/20" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 shadow-inner">
                    <Truck className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <ArrowDownLeft className="size-3" /> REDUCES BALANCE
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transport Charges</p>
                  <p className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 sm:text-3xl">
                    −{formatCurrency(summary.totalTransportCharges)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-cyan-500/15 pt-3 text-xs text-muted-foreground">
                  <span>Freight offset against payable</span>
                  <span className="font-medium text-cyan-600 dark:text-cyan-400">Purchase Adjustment</span>
                </div>
              </div>

              {/* 5. Pending Cheque Settlements - Featured Card taking 2 columns */}
              <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-card to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-md md:col-span-2">
                <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-purple-500/10 blur-3xl transition-all duration-300 group-hover:bg-purple-500/20" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-inner">
                      <Clock className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Cheque Settlements</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                          AT RISK IF RETURNED
                        </span>
                      </div>
                      <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        {formatCurrency(summary.pendingChequeSettlements)}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-xs text-xs text-muted-foreground sm:text-right">
                    Already reduced the balance above — a cheque marked bounced would add this amount back to what&apos;s owed.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </section>

      {/* History */}
      <section className="space-y-3 rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-4 sm:p-6 sm:pb-0">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">History</h2>
              {historyFetching && !historyLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={history.length === 0 || isExportingCsv}>
                {isExportingCsv ? <Loader2 className="animate-spin" /> : <Download />}
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={history.length === 0 || !summary || isExportingPdf}>
                {isExportingPdf ? <Loader2 className="animate-spin" /> : <FileDown />}
                PDF
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            A settlement cheque reduces the balance as soon as it&apos;s recorded, marked with a status badge — only if it&apos;s
            later returned does the row&apos;s previous and after balance match, showing it never actually settled the debt.
          </p>

          {exportError && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
              {exportError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search description, supplier, invoice..."
                value={search}
                onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => resetPageAnd(setTypeFilter)(value as TypeFilter)}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(TYPE_META) as CreditBalanceEntryType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_META[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)} className="w-auto" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => resetPageAnd(setDateTo)(e.target.value)} className="w-auto" />
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : historyError ? (
            <QueryErrorState error={historyErrorObj} onRetry={() => refetchHistory()} />
          ) : history.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={Search}
                title="No matching entries"
                description="Try adjusting or clearing your filters"
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={HandCoins} title="No history yet" description="Purchases, returns, and settlements will appear here" />
            )
          ) : (
            <>
              <div className={cn('hidden lg:block', historyFetching && 'opacity-60 transition-opacity')}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Previous Balance</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => {
                      const meta = TYPE_META[row.type];
                      const Icon = meta.icon;
                      const faceAmount = Number(row.faceAmount);
                      const statusMeta = row.status ? STATUS_META[row.status] : null;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-normal break-words">{formatDate(row.date)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                                <Icon className="size-4 shrink-0" />
                                {meta.label}
                              </span>
                              {statusMeta && (
                                <Badge variant={statusMeta.variant} className="w-fit">
                                  {statusMeta.label}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            <p>{row.description}</p>
                            {row.mode && <p className="text-xs text-muted-foreground">{row.mode.replace('_', ' ')}</p>}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-right text-muted-foreground">
                            {formatCurrency(row.balanceBefore)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'whitespace-normal break-words text-right font-medium',
                              faceAmount > 0 ? 'text-success' : faceAmount < 0 ? 'text-destructive' : 'text-muted-foreground',
                            )}
                          >
                            {faceAmount >= 0 ? '+' : ''}
                            {formatCurrency(faceAmount)}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-right font-semibold">
                            {formatCurrency(row.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className={cn('space-y-3 lg:hidden', historyFetching && 'opacity-60 transition-opacity')}>
                {history.map((row) => {
                  const meta = TYPE_META[row.type];
                  const Icon = meta.icon;
                  const faceAmount = Number(row.faceAmount);
                  const statusMeta = row.status ? STATUS_META[row.status] : null;
                  return (
                    <div key={row.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                          <Icon className="size-4 shrink-0" />
                          {meta.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 break-words font-medium',
                            faceAmount > 0 ? 'text-success' : faceAmount < 0 ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {faceAmount >= 0 ? '+' : ''}
                          {formatCurrency(faceAmount)}
                        </span>
                      </div>
                      {statusMeta && (
                        <Badge variant={statusMeta.variant} className="mt-2 w-fit">
                          {statusMeta.label}
                        </Badge>
                      )}
                      <p className="mt-2 break-words text-sm font-medium">{row.description}</p>
                      {row.mode && <p className="text-xs text-muted-foreground">{row.mode.replace('_', ' ')}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                        <span>{formatDate(row.date)}</span>
                        <span>
                          {formatCurrency(row.balanceBefore)} → <span className="font-semibold text-foreground">{formatCurrency(row.balanceAfter)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationBar meta={historyResult?.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
