'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowDownLeft,
  ArrowUpCircle,
  ArrowUpRight,
  Clock,
  Download,
  FileDown,
  HandCoins,
  Landmark,
  MinusCircle,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/loading-state';
import { useLiquidCashSummary, useLiquidCashHistory } from '@/hooks/use-liquid-cash';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { downloadCsv } from '@/lib/csv';
import { downloadLiquidCashStatementPdf } from '@/lib/liquid-cash-pdf';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { LiquidCashEntryType, LiquidCashHistoryEntry } from '@/lib/api/types';

type TypeFilter = 'all' | LiquidCashEntryType;
type StatusKey = 'PENDING' | 'CLEARED' | 'RETURNED';

const EXPORT_CAP = 10_000;

const TYPE_META: Record<LiquidCashEntryType, { label: string; icon: typeof ArrowDownCircle; tone: string }> = {
  INVESTMENT: { label: 'Investment', icon: TrendingUp, tone: 'text-primary' },
  DEALER_PAYMENT: { label: 'Dealer Payment', icon: ArrowDownCircle, tone: 'text-success' },
  SUPPLIER_PAYMENT: { label: 'Supplier Payment', icon: ArrowUpCircle, tone: 'text-destructive' },
  EXPENSE: { label: 'Expense', icon: MinusCircle, tone: 'text-destructive' },
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

function downloadHistoryCsv(filename: string, rows: LiquidCashHistoryEntry[]) {
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

export default function LiquidCashPage() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, error: summaryErrorObj, refetch: refetchSummary } =
    useLiquidCashSummary();

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
  } = useLiquidCashHistory({ page, limit: 20, ...historyFilters });

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
      const allRows = await fetchAllPages((p, limit) => api.liquidCash.history({ ...historyFilters, page: p, limit }));
      downloadHistoryCsv(`liquid-cash-history-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
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
      const allRows = await fetchAllPages((p, limit) => api.liquidCash.history({ ...historyFilters, page: p, limit }));
      await downloadLiquidCashStatementPdf(`liquid-cash-statement-${new Date().toISOString().slice(0, 10)}.pdf`, allRows, {
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
    <div className="space-y-6">
      <PageHeader
        title="Liquid Cash"
        description="Every event that moves actual cash — investments, dealer collections, supplier payments, and expenses — with a running balance so you can see exactly how the current figure was reached."
        backHref="/admin/dashboard"
        backLabel="Back to Dashboard"
      />

      {summaryLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      ) : summaryError ? (
        <Card>
          <QueryErrorState error={summaryErrorObj} onRetry={() => refetchSummary()} title="Couldn't load the cash position" />
        </Card>
      ) : (
        summary && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Current Cash Position"
                value={formatCurrency(animatedBalance)}
                icon={Landmark}
                tone={summary.balance < 0 ? 'destructive' : 'default'}
                hint="All-time, cleared only"
              />
              <StatCard
                label="Pending Cheques"
                value={formatCurrency(summary.pendingDealerCheques + summary.pendingSupplierCheques)}
                icon={Clock}
                tone="purple"
                hint="Pending clearance"
              />
              <StatCard
                label="Pending Dealer Cheques (In)"
                value={formatCurrency(summary.pendingDealerCheques)}
                icon={ArrowDownLeft}
                tone="success"
              />
              <StatCard
                label="Pending Supplier Cheques (Out)"
                value={formatCurrency(summary.pendingSupplierCheques)}
                icon={ArrowUpRight}
                tone="warning"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Cash flow statement */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle>Financial Flow Breakdown</CardTitle>
                  <CardDescription>How the current cash position is reached, all-time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="pb-1 text-xs font-semibold text-muted-foreground">Inflows</p>
                    <StatementRow
                      icon={TrendingUp}
                      label="Investments In"
                      sub="Capital additions · Direct cash entry"
                      value={formatCurrency(summary.totalInvestments)}
                    />
                    <StatementRow
                      icon={Wallet}
                      label="Dealer Collections In"
                      sub="Cleared dealer settlements · Liquid receipts"
                      value={formatCurrency(summary.totalCollected)}
                      valueClassName="text-success"
                    />
                  </div>
                  <div>
                    <p className="pb-1 text-xs font-semibold text-muted-foreground">Outflows</p>
                    <StatementRow
                      icon={HandCoins}
                      label="Supplier Payments Out"
                      sub="Inventory supplier payouts · Liquid payouts"
                      value={`−${formatCurrency(summary.totalPaidToSuppliers)}`}
                      valueClassName="text-destructive"
                    />
                    <StatementRow
                      icon={Receipt}
                      label="Expenses Out"
                      sub="Operational expenses · Business costs"
                      value={`−${formatCurrency(summary.totalExpensesPaid)}`}
                      valueClassName="text-destructive"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Current Cash Position</p>
                      <p className="text-xs text-muted-foreground">
                        Investments + cleared dealer collections − cleared supplier payments − expenses, all-time.
                      </p>
                    </div>
                    <p
                      className={cn(
                        'shrink-0 text-lg font-semibold tabular-nums',
                        summary.balance < 0 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {formatCurrency(animatedBalance)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Pending cheques */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Pending Cheques</CardTitle>
                    <Badge variant="purple">Pending clearance</Badge>
                  </div>
                  <CardDescription>
                    Cheques awaiting bank clearance. These do not affect the current liquid cash balance until cleared.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StatementRow
                    label="Pending Dealer Cheques (In)"
                    value={formatCurrency(summary.pendingDealerCheques)}
                  />
                  <StatementRow
                    label="Pending Supplier Cheques (Out)"
                    value={formatCurrency(summary.pendingSupplierCheques)}
                  />
                  <div className="mt-1 flex items-center justify-between gap-3 border-t-2 border-border pt-2.5">
                    <p className="text-sm font-semibold text-foreground">Total Pending</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(summary.pendingDealerCheques + summary.pendingSupplierCheques)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="History"
          description="Pending and returned cheques appear too, marked with a status badge — they show a $0 balance impact until they actually clear, which is why the previous and after balance match on those rows."
          isFetching={historyFetching && !historyLoading}
          className="pb-3"
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={history.length === 0}
                loading={isExportingCsv}
              >
                {!isExportingCsv && <Download />}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={history.length === 0 || !summary}
                loading={isExportingPdf}
              >
                {!isExportingPdf && <FileDown />}
                PDF
              </Button>
            </>
          }
        />

        {exportError && (
          <div className="px-4 pb-3 sm:px-5">
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground dark:text-warning">
              {exportError}
            </p>
          </div>
        )}

        <FilterBar>
          <div className="relative flex-1 sm:min-w-[12rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search description, dealer, supplier..."
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
              {(Object.keys(TYPE_META) as LiquidCashEntryType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)} className="w-auto" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => resetPageAnd(setDateTo)(e.target.value)} className="w-auto" />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

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
            <EmptyState icon={Landmark} title="No history yet" description="Investments, payments, and expenses will appear here" />
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
                        <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                              <Icon className="size-4 shrink-0" />
                              {meta.label}
                            </span>
                            {statusMeta && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">
                          <div>{row.description}</div>
                          {row.mode && <div className="text-xs text-muted-foreground">{row.mode.replace('_', ' ')}</div>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(row.balanceBefore)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium tabular-nums',
                            faceAmount > 0 ? 'text-success' : faceAmount < 0 ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {faceAmount >= 0 ? '+' : ''}
                          {formatCurrency(faceAmount)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-semibold tabular-nums',
                            Number(row.balanceAfter) < 0 ? 'text-destructive' : 'text-foreground',
                          )}
                        >
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
                          faceAmount > 0 ? 'text-success' : faceAmount < 0 ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {faceAmount >= 0 ? '+' : ''}
                        {formatCurrency(faceAmount)}
                      </span>
                    </div>
                    {statusMeta && (
                      <Badge variant={statusMeta.variant} className="mt-2">
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
    </div>
  );
}

/** One label/value line in a statement-style card. */
function StatementRow({
  icon: Icon,
  label,
  sub,
  value,
  valueClassName,
}: {
  icon?: LucideIcon;
  label: string;
  sub?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      <p className={cn('shrink-0 text-sm font-medium tabular-nums text-foreground', valueClassName)}>{value}</p>
    </div>
  );
}
