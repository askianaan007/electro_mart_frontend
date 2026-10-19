'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock,
  Download,
  FileDown,
  HandCoins,
  Loader2,
  Package,
  PackageCheck,
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
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/loading-state';
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
  // Goods received in place of returned ones — adds back to the payable.
  REPLACEMENT: { label: 'Replacement', icon: PackageCheck, tone: 'text-primary' },
  SETTLEMENT: { label: 'Settlement', icon: HandCoins, tone: 'text-destructive' },
  // Cash a supplier paid back to clear a credit they owed us — adds back.
  REFUND: { label: 'Refund Received', icon: Banknote, tone: 'text-primary' },
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

const FLOW_TONES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  purple: 'bg-purple/10 text-purple',
} as const;

/** One tile in the payable-flow breakdown: label, figure, direction badge and a short footnote. */
function FlowTile({
  label,
  value,
  icon: Icon,
  tone,
  direction,
  footnote,
  footnoteLabel,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone: keyof typeof FLOW_TONES;
  direction: 'adds' | 'reduces';
  footnote: string;
  footnoteLabel: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', FLOW_TONES[tone])}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="mt-1 text-2xl font-semibold leading-tight tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex-1">
        <Badge variant={direction === 'adds' ? 'info' : 'muted'}>
          {direction === 'adds' ? <ArrowUpRight /> : <ArrowDownLeft />}
          {direction === 'adds' ? 'Adds to balance' : 'Reduces balance'}
        </Badge>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{footnote}</span>
        <span className="font-medium text-foreground">{footnoteLabel}</span>
      </div>
    </div>
  );
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
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary,
  } = useCreditBalanceSummary();

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
      setExportError(
        `This filter matches ${historyResult.meta.total.toLocaleString()} rows. Narrow the date range to under ${EXPORT_CAP.toLocaleString()} before exporting.`,
      );
      return;
    }
    setExportError(null);
    setIsExportingCsv(true);
    try {
      const allRows = await fetchAllPages((p, limit) =>
        api.creditBalance.history({ ...historyFilters, page: p, limit }),
      );
      downloadHistoryCsv(`credit-balance-history-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleExportPdf() {
    if (!historyResult || !summary) return;
    if (historyResult.meta.total > EXPORT_CAP) {
      setExportError(
        `This filter matches ${historyResult.meta.total.toLocaleString()} rows. Narrow the date range to under ${EXPORT_CAP.toLocaleString()} before exporting.`,
      );
      return;
    }
    setExportError(null);
    setIsExportingPdf(true);
    try {
      const allRows = await fetchAllPages((p, limit) =>
        api.creditBalance.history({ ...historyFilters, page: p, limit }),
      );
      await downloadCreditBalanceStatementPdf(
        `credit-balance-statement-${new Date().toISOString().slice(0, 10)}.pdf`,
        allRows,
        {
          filterSummary: filterSummaryLabel(),
          dateFrom,
          dateTo,
          summary,
        },
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Balance"
        description={
          <>
            Every event that changes what&apos;s owed to suppliers — purchases, transport charges, returns, and
            settlements — with a running balance so you can see exactly how the current figure was reached.
          </>
        }
        backHref="/admin/dashboard"
        backLabel="Back to Dashboard"
      />

      {/* Headline balance with animated count-up */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-muted-foreground">Current Credit Balance</p>
          {summaryLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : summaryError ? (
            <QueryErrorState
              error={summaryErrorObj}
              onRetry={() => refetchSummary()}
              className="items-start py-0 text-left"
            />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
              {formatCurrency(animatedBalance)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Purchases − purchase returns + replacements − settlements paid − transport charges + refunds received,
            all-time.
          </p>
        </div>
      </section>

      {/* Breakdown */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Payable Flow Breakdown</h2>

        {summaryLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
            <Skeleton className="h-24 rounded-xl sm:col-span-2 xl:col-span-4" />
          </div>
        ) : summaryError ? null : (
          summary && (
            <div
              className={cn(
                'grid gap-4 sm:grid-cols-2',
                { 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-3' }[
                  (4 + Number(!!summary.totalReplacements) + Number(!!summary.totalRefundsReceived)) as 4 | 5 | 6
                ],
              )}
            >
              <FlowTile
                label="Purchases"
                value={formatCurrency(summary.totalPurchases)}
                icon={Package}
                tone="default"
                direction="adds"
                footnote="Goods bought on credit"
                footnoteLabel="All-Time Purchases"
              />
              <FlowTile
                label="Settlements Paid"
                value={`−${formatCurrency(summary.totalSettled)}`}
                icon={HandCoins}
                tone="success"
                direction="reduces"
                footnote="Cash, bank & cheque settlements"
                footnoteLabel="Debt Paid Down"
              />
              <FlowTile
                label="Purchase Returns"
                value={`−${formatCurrency(summary.totalReturns)}`}
                icon={Undo2}
                tone="warning"
                direction="reduces"
                footnote="Goods sent back to suppliers"
                footnoteLabel="Credited Back"
              />
              {!!summary.totalReplacements && (
                <FlowTile
                  label="Replacements"
                  value={`+${formatCurrency(summary.totalReplacements)}`}
                  icon={PackageCheck}
                  tone="default"
                  direction="adds"
                  footnote="Goods received in place of returns"
                  footnoteLabel="Added Back"
                />
              )}
              {!!summary.totalRefundsReceived && (
                <FlowTile
                  label="Refunds Received"
                  value={`+${formatCurrency(summary.totalRefundsReceived)}`}
                  icon={Banknote}
                  tone="purple"
                  direction="adds"
                  footnote="Cash suppliers paid back to us"
                  footnoteLabel="Added Back"
                />
              )}
              <FlowTile
                label="Transport Charges"
                value={`−${formatCurrency(summary.totalTransportCharges)}`}
                icon={Truck}
                tone="info"
                direction="reduces"
                footnote="Freight offset against payable"
                footnoteLabel="Purchase Adjustment"
              />

              {/* Pending Cheque Settlements — full-width */}
              <div className="col-span-full rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
                      <Clock className="size-[18px]" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-medium text-muted-foreground">Pending Cheque Settlements</p>
                        <Badge variant="purple">At risk if returned</Badge>
                      </div>
                      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                        {formatCurrency(summary.pendingChequeSettlements)}
                      </p>
                    </div>
                  </div>
                  <p className="max-w-xs text-xs text-muted-foreground sm:text-right">
                    Already reduced the balance above — a cheque marked bounced would add this amount back to
                    what&apos;s owed.
                  </p>
                </div>
              </div>
            </div>
          )
        )}
      </section>

      {/* History */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="History"
          isFetching={historyFetching && !historyLoading}
          className="pb-3"
          description={
            <>
              A settlement cheque reduces the balance as soon as it&apos;s recorded, marked with a status badge — only
              if it&apos;s later returned does the row&apos;s previous and after balance match, showing it never
              actually settled the debt.
            </>
          }
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={history.length === 0 || isExportingCsv}
              >
                {isExportingCsv ? <Loader2 className="animate-spin" /> : <Download />}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={history.length === 0 || !summary || isExportingPdf}
              >
                {isExportingPdf ? <Loader2 className="animate-spin" /> : <FileDown />}
                PDF
              </Button>
            </>
          }
        />

        {exportError && (
          <div className="px-4 pb-3 sm:px-5">
            <p className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground dark:text-warning">
              {exportError}
            </p>
          </div>
        )}

        <FilterBar className="border-t">
          <div className="relative flex-1 sm:max-w-xs">
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)}
              className="min-w-0 w-full sm:w-auto"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => resetPageAnd(setDateTo)(e.target.value)}
              className="min-w-0 w-full sm:w-auto"
            />
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        <div>
          {historyLoading ? (
            <TableSkeleton rows={6} />
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
              <EmptyState
                icon={HandCoins}
                title="No history yet"
                description="Purchases, returns, and settlements will appear here"
              />
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
                          <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                            {formatCurrency(row.balanceBefore)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'whitespace-normal break-words text-right font-medium tabular-nums',
                              faceAmount > 0
                                ? 'text-success'
                                : faceAmount < 0
                                  ? 'text-destructive'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {faceAmount >= 0 ? '+' : ''}
                            {formatCurrency(faceAmount)}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-right font-semibold tabular-nums">
                            {formatCurrency(row.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className={cn('space-y-3 p-4 lg:hidden', historyFetching && 'opacity-60 transition-opacity')}>
                {history.map((row) => {
                  const meta = TYPE_META[row.type];
                  const Icon = meta.icon;
                  const faceAmount = Number(row.faceAmount);
                  const statusMeta = row.status ? STATUS_META[row.status] : null;
                  return (
                    <div key={row.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                          <Icon className="size-4 shrink-0" />
                          {meta.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 break-words font-medium tabular-nums',
                            faceAmount > 0
                              ? 'text-success'
                              : faceAmount < 0
                                ? 'text-destructive'
                                : 'text-muted-foreground',
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
                        <span className="tabular-nums">
                          {formatCurrency(row.balanceBefore)} →{' '}
                          <span className="font-semibold text-foreground">{formatCurrency(row.balanceAfter)}</span>
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
