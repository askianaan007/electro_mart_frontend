'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowDownLeft,
  ArrowUpCircle,
  ArrowUpRight,
  Banknote,
  Download,
  FileDown,
  HandCoins,
  Landmark,
  MinusCircle,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  TrendingUp,
  Undo2,
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
import { CashAdjustmentDialog, type CashAdjustmentKind } from '@/components/admin/cash-adjustment-dialog';
import { ReverseCashAdjustmentDialog } from '@/components/admin/reverse-cash-adjustment-dialog';
import { useLiquidCashSummary, useLiquidCashHistory } from '@/hooks/use-liquid-cash';
import { useCashAdjustments } from '@/hooks/use-cash-adjustments';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { downloadCsv } from '@/lib/csv';
import {
  downloadLiquidCashStatementPdf,
  LIQUID_CASH_TYPE_LABEL,
  liquidCashEventMeta,
} from '@/lib/liquid-cash-pdf';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type {
  CashAdjustment,
  CashAdjustmentType,
  LiquidCashEntryType,
  LiquidCashHistoryEntry,
} from '@/lib/api/types';

type TypeFilter = 'all' | LiquidCashEntryType;
type StatusKey = 'PENDING' | 'CLEARED' | 'RETURNED';

const EXPORT_CAP = 10_000;

type TypeMeta = { label: string; icon: LucideIcon; tone: string };

const TYPE_META: Record<LiquidCashEntryType, TypeMeta> = {
  INVESTMENT: { label: LIQUID_CASH_TYPE_LABEL.INVESTMENT, icon: TrendingUp, tone: 'text-primary' },
  DEALER_PAYMENT: { label: LIQUID_CASH_TYPE_LABEL.DEALER_PAYMENT, icon: ArrowDownCircle, tone: 'text-success' },
  SUPPLIER_PAYMENT: { label: LIQUID_CASH_TYPE_LABEL.SUPPLIER_PAYMENT, icon: ArrowUpCircle, tone: 'text-destructive' },
  EXPENSE: { label: LIQUID_CASH_TYPE_LABEL.EXPENSE, icon: MinusCircle, tone: 'text-destructive' },
  // Either direction: paid to a dealer (−) or received from a supplier (+).
  REFUND: { label: LIQUID_CASH_TYPE_LABEL.REFUND, icon: Undo2, tone: 'text-info' },
  ADJUSTMENT: { label: LIQUID_CASH_TYPE_LABEL.ADJUSTMENT, icon: Scale, tone: 'text-purple' },
};

/** Never crash on a type a newer backend adds. */
function typeMeta(type: string): TypeMeta {
  return TYPE_META[type as LiquidCashEntryType] ?? { label: type, icon: Wallet, tone: 'text-foreground' };
}

const ADJUSTMENT_TYPE_LABEL: Record<CashAdjustmentType, string> = {
  OPENING_BALANCE: 'Opening balance',
  ADJUSTMENT: 'Adjustment',
  SETTLEMENT_REVERSAL: 'Commission payout reversal',
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
  const header = [
    'Date',
    'Type',
    'Event',
    'Status',
    'Scheduled',
    'Description',
    'Mode',
    'Reference',
    'Previous Balance',
    'Face Amount',
    'Balance Impact',
    'Balance After',
  ];
  downloadCsv(
    filename,
    header,
    rows.map((row) => [
      formatDate(row.date),
      typeMeta(row.type).label,
      liquidCashEventMeta(row.event)?.label ?? 'Recorded',
      row.status ?? '',
      row.isFuture ? 'Yes' : '',
      row.description,
      row.mode ? row.mode.replace('_', ' ') : '',
      row.reference ?? '',
      Number(row.balanceBefore),
      Number(row.faceAmount),
      // What actually moved the balance — 0 on an uncleared/returned cheque's original row.
      Number(row.amount),
      Number(row.balanceAfter),
    ]),
  );
}

/** "+1,000.00" / "−1,000.00" for a signed figure. */
function signedCurrency(value: string | number) {
  const n = Number(value);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCurrency(Math.abs(n))}`;
}

function amountTone(value: string | number) {
  const n = Number(value);
  return n > 0 ? 'text-success' : n < 0 ? 'text-destructive' : 'text-muted-foreground';
}

export default function LiquidCashPage() {
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary,
  } = useLiquidCashSummary();

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
    if (typeFilter !== 'all') parts.push(typeMeta(typeFilter).label);
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
      const allRows = await fetchAllPages((p, limit) => api.liquidCash.history({ ...historyFilters, page: p, limit }));
      downloadHistoryCsv(`liquid-cash-history-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
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
      const allRows = await fetchAllPages((p, limit) => api.liquidCash.history({ ...historyFilters, page: p, limit }));
      await downloadLiquidCashStatementPdf(
        `liquid-cash-statement-${new Date().toISOString().slice(0, 10)}.pdf`,
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
        title="Liquid Cash"
        description="Every event that moves actual cash — opening balance, investments and withdrawals, dealer collections, supplier payments, expenses, refunds, and evidenced adjustments — with a running balance so you can see exactly how the current figure was reached."
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
          <QueryErrorState
            error={summaryErrorObj}
            onRetry={() => refetchSummary()}
            title="Couldn't load the cash position"
          />
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
                label="Net Capital"
                value={formatCurrency(summary.totalInvestments)}
                icon={PiggyBank}
                tone="info"
                hint="Deposits − withdrawals"
              />
              {/* Expected in and out are deliberately kept apart — adding them together means nothing. */}
              <StatCard
                label="Expected in (uncleared)"
                value={formatCurrency(summary.pendingIn)}
                icon={ArrowDownLeft}
                tone="success"
                hint="Not in balance until cleared"
              />
              <StatCard
                label="Expected out (uncleared)"
                value={formatCurrency(summary.pendingOut)}
                icon={ArrowUpRight}
                tone="warning"
                hint="Not in balance until cleared"
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
                    {summary.openingBalance !== 0 && (
                      <StatementRow
                        icon={Landmark}
                        label="Opening Balance"
                        sub="Cash held before the first recorded entry"
                        value={signedCurrency(summary.openingBalance)}
                        valueClassName={amountTone(summary.openingBalance)}
                      />
                    )}
                    <StatementRow
                      icon={TrendingUp}
                      label="Investor Deposits In"
                      sub="Capital additions · Cleared only"
                      value={signedCurrency(summary.totalDeposits)}
                      valueClassName={amountTone(summary.totalDeposits)}
                    />
                    <StatementRow
                      icon={Banknote}
                      label="Investor Withdrawals Out"
                      sub="Capital taken out · Cleared only"
                      value={signedCurrency(-summary.totalWithdrawals)}
                      valueClassName={amountTone(-summary.totalWithdrawals)}
                    />
                    <StatementRow
                      icon={Wallet}
                      label="Dealer Collections In"
                      sub="Cleared dealer settlements · Liquid receipts"
                      value={signedCurrency(summary.totalCollected)}
                      valueClassName={amountTone(summary.totalCollected)}
                    />
                    <StatementRow
                      icon={Undo2}
                      label="Refunds Received In"
                      sub="Refunds from suppliers"
                      value={signedCurrency(summary.totalRefundsReceived)}
                      valueClassName={amountTone(summary.totalRefundsReceived)}
                    />
                    <StatementRow
                      icon={HandCoins}
                      label="Supplier Payments Out"
                      sub="Inventory supplier payouts · Liquid payouts"
                      value={signedCurrency(-summary.totalPaidToSuppliers)}
                      valueClassName={amountTone(-summary.totalPaidToSuppliers)}
                    />
                    <StatementRow
                      icon={Receipt}
                      label="Expenses Out"
                      sub="Operational expenses · Business costs"
                      value={signedCurrency(-summary.totalExpensesPaid)}
                      valueClassName={amountTone(-summary.totalExpensesPaid)}
                    />
                    <StatementRow
                      icon={Undo2}
                      label="Refunds Paid Out"
                      sub="Refunds to dealers"
                      value={signedCurrency(-summary.totalRefundsPaid)}
                      valueClassName={amountTone(-summary.totalRefundsPaid)}
                    />
                    {summary.totalAdjustments !== 0 && (
                      <StatementRow
                        icon={Scale}
                        label="Adjustments"
                        sub="Evidenced corrections · Commission payout reversals"
                        value={signedCurrency(summary.totalAdjustments)}
                        valueClassName={amountTone(summary.totalAdjustments)}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Current Cash Position</p>
                      <p className="text-xs text-muted-foreground">
                        Opening balance + deposits − withdrawals + cleared dealer collections + refunds received −
                        cleared supplier payments − expenses − refunds paid ± adjustments, all-time.
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
                  {summary.scheduled !== 0 && (
                    <p className="rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs text-info">
                      {signedCurrency(summary.scheduled)} of entries dated in the future is scheduled and not yet
                      included in the current cash position.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Uncleared cheques — in and out shown separately, never netted or summed. */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>Uncleared Cheques</CardTitle>
                    <Badge variant="purple">Pending clearance</Badge>
                  </div>
                  <CardDescription>
                    Cheques awaiting bank clearance. They do not affect the current cash position until cleared.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ExpectedBlock
                    title="Expected in (uncleared)"
                    total={summary.pendingIn}
                    totalClassName="text-success"
                    lines={[
                      {
                        label: 'Dealer cheques',
                        count: summary.pendingDealerChequeCount,
                        value: summary.pendingDealerCheques,
                      },
                      { label: 'Investment cheques', value: summary.pendingInvestmentCheques },
                      { label: 'Supplier refund cheques', value: summary.pendingRefundChequesIn },
                    ]}
                  />
                  <ExpectedBlock
                    title="Expected out (uncleared)"
                    total={summary.pendingOut}
                    totalClassName="text-destructive"
                    lines={[
                      {
                        label: 'Supplier cheques',
                        count: summary.pendingSupplierChequeCount,
                        value: summary.pendingSupplierCheques,
                      },
                      { label: 'Withdrawal cheques', value: summary.pendingWithdrawalCheques },
                      { label: 'Dealer refund cheques', value: summary.pendingRefundChequesOut },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}

      <CashAdjustmentsSection openingBalance={summary?.openingBalance} />

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="History"
          description="Pending and returned cheques appear with a status badge and a $0 balance impact until they actually clear (their face value is shown underneath). Edits, deletions, cheque clearances and reversals are separate dated correction rows linked to the original entry; future-dated rows are marked Scheduled and are not in the current balance."
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
              icon={Landmark}
              title="No history yet"
              description="Opening balance, investments, payments, expenses, refunds, and adjustments will appear here"
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
                    <TableHead className="text-right">Balance Impact</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => {
                    const meta = typeMeta(row.type);
                    const Icon = meta.icon;
                    const amount = Number(row.amount);
                    const faceNote = faceAmountNote(row);
                    return (
                      <TableRow key={row.id} className={cn(row.isFuture && 'bg-info/5')}>
                        <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                              <Icon className="size-4 shrink-0" />
                              {meta.label}
                            </span>
                            <HistoryRowBadges row={row} />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">
                          <div>{row.description}</div>
                          {row.mode && (
                            <div className="text-xs text-muted-foreground">{row.mode.replace('_', ' ')}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(row.balanceBefore)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className={cn('font-medium', amountTone(amount))}>{signedCurrency(amount)}</div>
                          {faceNote && <div className="text-xs text-muted-foreground">{faceNote}</div>}
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
                const meta = typeMeta(row.type);
                const Icon = meta.icon;
                const amount = Number(row.amount);
                const faceNote = faceAmountNote(row);
                return (
                  <div
                    key={row.id}
                    className={cn('rounded-lg border border-border bg-card p-4', row.isFuture && 'border-info/30')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.tone)}>
                        <Icon className="size-4 shrink-0" />
                        {meta.label}
                      </span>
                      <span className={cn('shrink-0 break-words font-medium tabular-nums', amountTone(amount))}>
                        {signedCurrency(amount)}
                      </span>
                    </div>
                    {faceNote && <p className="mt-0.5 text-right text-xs text-muted-foreground">{faceNote}</p>}
                    <HistoryRowBadges row={row} className="mt-2" />
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

/** "Face 5,000.00" under an original cheque row whose balance impact differs (uncleared or returned). */
function faceAmountNote(row: LiquidCashHistoryEntry) {
  if (row.event !== 'RECORDED' || Number(row.faceAmount) === Number(row.amount)) return null;
  return `Face ${formatCurrency(row.faceAmount)}`;
}

/** Cheque status, correction/adjustment event and "Scheduled" badges for one history row. */
function HistoryRowBadges({ row, className }: { row: LiquidCashHistoryEntry; className?: string }) {
  const statusMeta = row.status ? STATUS_META[row.status] : null;
  const eventMeta = liquidCashEventMeta(row.event);
  if (!statusMeta && !eventMeta && !row.isFuture) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {eventMeta && <Badge variant={eventMeta.tone}>{eventMeta.label}</Badge>}
      {statusMeta && <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>}
      {row.isFuture && <Badge variant="info">Scheduled</Badge>}
    </div>
  );
}

/** One direction of uncleared cheques: a total plus its non-zero parts. */
function ExpectedBlock({
  title,
  total,
  totalClassName,
  lines,
}: {
  title: string;
  total: number;
  totalClassName?: string;
  lines: { label: string; value: number; count?: number }[];
}) {
  const visible = lines.filter((line) => line.value !== 0);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b-2 border-border pb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className={cn('text-sm font-semibold tabular-nums', total !== 0 ? totalClassName : 'text-muted-foreground')}>
          {formatCurrency(total)}
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="py-2.5 text-xs text-muted-foreground">Nothing awaiting clearance.</p>
      ) : (
        visible.map((line) => (
          <StatementRow
            key={line.label}
            label={line.label}
            sub={line.count ? `${line.count} cheque${line.count === 1 ? '' : 's'}` : undefined}
            value={formatCurrency(line.value)}
          />
        ))
      )}
    </div>
  );
}

const ADJUSTMENTS_PAGE_SIZE = 20;

/** Opening balance and evidenced cash corrections — the only way to change Liquid Cash without a source record. */
function CashAdjustmentsSection({ openingBalance }: { openingBalance: number | undefined }) {
  const [page, setPage] = useState(1);
  const [dialogKind, setDialogKind] = useState<CashAdjustmentKind>('ADJUSTMENT');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<CashAdjustment | null>(null);
  const [reverseOpen, setReverseOpen] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useCashAdjustments({
    page,
    limit: ADJUSTMENTS_PAGE_SIZE,
  });
  const rows = data?.data ?? [];

  // The list is paginated, so an active opening balance may sit on another page — the summary's
  // net opening balance is non-zero exactly when one is active, which covers that case.
  // The backend enforces "only one" regardless; this just hides a button that would be refused.
  const hasActiveOpening =
    (openingBalance ?? 0) !== 0 ||
    rows.some((row) => row.type === 'OPENING_BALANCE' && !row.reversalOfId && !row.reversedBy);

  function openCreate(kind: CashAdjustmentKind) {
    setDialogKind(kind);
    setDialogOpen(true);
  }

  function openReverse(row: CashAdjustment) {
    setReverseTarget(row);
    setReverseOpen(true);
  }

  const canReverse = (row: CashAdjustment) =>
    !row.reversalOfId && !row.reversedBy && row.type !== 'SETTLEMENT_REVERSAL';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title="Opening balance & adjustments"
        description="Evidenced changes to cash with no other source record. Nothing is edited or deleted — a mistake is corrected by reversing it."
        isFetching={isFetching && !isLoading}
        className="pb-3"
        actions={
          <>
            {!hasActiveOpening && openingBalance !== undefined && (
              <Button variant="outline" size="sm" onClick={() => openCreate('OPENING_BALANCE')}>
                <Landmark />
                Set opening balance
              </Button>
            )}
            <Button size="sm" onClick={() => openCreate('ADJUSTMENT')}>
              <Plus />
              Record adjustment
            </Button>
          </>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No opening balance or adjustments"
          description="Set the opening balance if the business held cash before its first recorded entry, and record evidenced corrections here."
        />
      ) : (
        <>
          <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium tabular-nums">{row.adjustmentNumber}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.adjustmentDate)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-medium">{ADJUSTMENT_TYPE_LABEL[row.type] ?? row.type}</span>
                        <AdjustmentBadges row={row} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{row.reason}</TableCell>
                    <TableCell className="whitespace-normal break-words text-muted-foreground">
                      {row.evidenceReference ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.admin?.name ?? '—'}</TableCell>
                    <TableCell className={cn('text-right font-medium tabular-nums', amountTone(row.amount))}>
                      {signedCurrency(row.amount)}
                    </TableCell>
                    <TableCell>
                      {canReverse(row) && (
                        <Button variant="ghost" size="sm" onClick={() => openReverse(row)}>
                          <RotateCcw />
                          Reverse
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {row.adjustmentNumber} · {ADJUSTMENT_TYPE_LABEL[row.type] ?? row.type}
                  </span>
                  <span className={cn('shrink-0 font-medium tabular-nums', amountTone(row.amount))}>
                    {signedCurrency(row.amount)}
                  </span>
                </div>
                <AdjustmentBadges row={row} className="mt-2" />
                <p className="mt-2 break-words text-sm">{row.reason}</p>
                {row.evidenceReference && (
                  <p className="break-words text-xs text-muted-foreground">Evidence: {row.evidenceReference}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>
                    {formatDate(row.adjustmentDate)}
                    {row.admin?.name ? ` · ${row.admin.name}` : ''}
                  </span>
                  {canReverse(row) && (
                    <Button variant="ghost" size="sm" onClick={() => openReverse(row)}>
                      <RotateCcw />
                      Reverse
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <PaginationBar meta={data?.meta} onPageChange={setPage} />
        </>
      )}

      <CashAdjustmentDialog open={dialogOpen} onOpenChange={setDialogOpen} kind={dialogKind} />
      <ReverseCashAdjustmentDialog open={reverseOpen} onOpenChange={setReverseOpen} adjustment={reverseTarget} />
    </div>
  );
}

/** Links between an adjustment and its reversal, plus the settlement behind a payout reversal. */
function AdjustmentBadges({ row, className }: { row: CashAdjustment; className?: string }) {
  const reversalOf = row.reversalOfId ? (row.reversalOf?.adjustmentNumber ?? 'earlier entry') : null;
  const reversedBy = row.reversedBy?.adjustmentNumber ?? null;
  const settlement = row.type === 'SETTLEMENT_REVERSAL' ? (row.settlement?.settlementNumber ?? null) : null;
  if (!reversalOf && !reversedBy && !settlement) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {reversalOf && <Badge variant="purple">Reversal of {reversalOf}</Badge>}
      {reversedBy && <Badge variant="muted">Reversed by {reversedBy}</Badge>}
      {settlement && <Badge variant="secondary">Settlement {settlement}</Badge>}
    </div>
  );
}
