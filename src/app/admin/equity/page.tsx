'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Download,
  Layers,
  MinusCircle,
  PieChart,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { useEquitySummary, useEquityHistory } from '@/hooks/use-equity';
import { useInvestments } from '@/hooks/use-investments';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { downloadCsv } from '@/lib/csv';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';
import type { EquityHistoryEntry, Investment } from '@/lib/api/types';

type HistoryType = 'INVESTMENT' | 'WITHDRAWAL' | 'EXPENSE';

const AVATAR_TONES = [
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/20 text-warning-foreground dark:text-warning',
  'bg-destructive/15 text-destructive',
];

const TYPE_META: Record<
  HistoryType,
  { label: string; icon: typeof ArrowDownCircle; className: string; badge: BadgeProps['variant'] }
> = {
  INVESTMENT: { label: 'Investment', icon: ArrowDownCircle, className: 'text-success', badge: 'success' },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpCircle, className: 'text-destructive', badge: 'destructive' },
  EXPENSE: { label: 'Expense', icon: MinusCircle, className: 'text-destructive', badge: 'warning' },
};

/** One label/value line of the equity statement; `total` draws the emphasised closing line. */
function StatementRow({
  label,
  value,
  total = false,
  muted = false,
  valueClassName,
}: {
  label: string;
  value: string;
  total?: boolean;
  muted?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-2',
        total && 'mt-1 border-t-2 border-border pt-3 text-[15px] font-semibold',
        muted && 'border-t border-border text-xs text-muted-foreground',
      )}
    >
      <span className={cn(!total && !muted && 'text-muted-foreground')}>{label}</span>
      <span className={cn('tabular-nums', total ? 'text-foreground' : 'font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

function downloadHistoryCsv(filename: string, rows: EquityHistoryEntry[]) {
  const header = ['Date', 'Type', 'Description', 'Investor', 'Amount'];
  downloadCsv(
    filename,
    header,
    rows.map((row) => [
      formatDate(row.date),
      TYPE_META[row.type].label,
      row.description,
      row.investorName ?? '—',
      row.amount,
    ]),
  );
}

export default function EquityPage() {
  const {
    data: equity,
    isLoading: equityLoading,
    isError: equityError,
    error: equityErrorObj,
    refetch: refetchEquity,
  } = useEquitySummary();

  const [historyPage, setHistoryPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | HistoryType>('all');
  const [investorFilter, setInvestorFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || typeFilter !== 'all' || investorFilter !== 'all' || !!dateFrom || !!dateTo;

  const historyFilters = {
    search: debouncedSearch || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    investorId: investorFilter === 'all' ? undefined : investorFilter,
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
  } = useEquityHistory({ page: historyPage, limit: 20, ...historyFilters });

  // Only used for the per-investor ledger breakdown dialog below — a bounded
  // supplementary view, independent of the paginated History list above.
  const { data: investmentsForBreakdown } = useInvestments({ page: 1, limit: 100 });
  const investmentsByInvestor = new Map<string, Investment[]>();
  for (const investment of investmentsForBreakdown?.data ?? []) {
    const list = investmentsByInvestor.get(investment.investorId) ?? [];
    list.push(investment);
    investmentsByInvestor.set(investment.investorId, list);
  }

  const investorOptions = equity?.entries ?? [];
  const history = historyResult?.data ?? [];

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setHistoryPage(1);
    };
  }

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setInvestorFilter('all');
    setDateFrom('');
    setDateTo('');
    setHistoryPage(1);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const allRows = await fetchAllPages((page, limit) => api.equity.history({ ...historyFilters, page, limit }));
      downloadHistoryCsv(`equity-history-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equity"
        description="Investment + profit share − expense share, per investor. Profit is calculated automatically from every completed sale — no manual entry needed."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={history.length === 0} loading={isExporting}>
            {!isExporting && <Download />}
            Export
          </Button>
        }
      />

      {equityLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      ) : equityError ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={equityErrorObj} onRetry={() => refetchEquity()} />
        </div>
      ) : (
        equity && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Total Investment"
                value={formatCurrency(equity.totals.totalInvestment)}
                icon={Wallet}
                hint={`Across ${equity.investorCount} investor${equity.investorCount === 1 ? '' : 's'}`}
              />
              <StatCard
                label="Total Profit Share"
                value={formatCurrency(equity.totals.totalProfit)}
                icon={TrendingUp}
                tone="success"
                hint="From completed sales"
              />
              <StatCard
                label="Total Expense Share"
                value={`−${formatCurrency(equity.totals.totalExpenses)}`}
                icon={Receipt}
                tone="destructive"
                hint="Total expenses"
              />
              <StatCard
                label="Total Equity"
                value={formatCurrency(equity.totals.totalEquity)}
                icon={Coins}
                tone="purple"
                hint="Current total equity"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Equity statement</CardTitle>
                <CardDescription>All investors combined, to date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 text-sm">
                <StatementRow label="Capital invested" value={formatCurrency(equity.totals.totalInvestment)} />
                <StatementRow
                  label="Add: profit share"
                  value={formatCurrency(equity.totals.totalProfit)}
                  valueClassName="text-success"
                />
                <StatementRow
                  label="Less: expense share"
                  value={`−${formatCurrency(equity.totals.totalExpenses)}`}
                  valueClassName="text-destructive"
                />
                <StatementRow
                  label="Total equity"
                  value={formatCurrency(equity.totals.totalEquity)}
                  total
                  valueClassName={Number(equity.totals.totalEquity) < 0 ? 'text-destructive' : undefined}
                />
                <StatementRow
                  label="Profit share allocated"
                  value={`${Number(equity.totals.percentageTotal)}%`}
                  muted
                  valueClassName={Number(equity.totals.percentageTotal) !== 100 ? 'text-destructive' : undefined}
                />
              </CardContent>
            </Card>
          </div>
        )
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Investor Equity Overview"
          description="Each investor's capital, profit share and expense share"
          className="pb-3"
          actions={
            equity && equity.entries.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setBreakdownOpen(true)}>
                <Layers />
                View Breakdown
              </Button>
            ) : undefined
          }
        />

        {equityLoading ? (
          <TableSkeleton rows={3} />
        ) : equityError ? (
          <QueryErrorState error={equityErrorObj} onRetry={() => refetchEquity()} />
        ) : !equity || equity.entries.length === 0 ? (
          <EmptyState icon={PieChart} title="No investors yet" description="Add investors under the Investments page" />
        ) : (
          <>
            <div className="hidden border-t border-border sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Share %</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead className="text-right">Profit Share</TableHead>
                    <TableHead className="text-right">Expense Share</TableHead>
                    <TableHead className="text-right">Equity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equity.entries.map((entry, i) => (
                    <TableRow key={entry.investorId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                              AVATAR_TONES[i % AVATAR_TONES.length],
                            )}
                          >
                            {initials(entry.investorName)}
                          </div>
                          <span className="whitespace-normal break-words">{entry.investorName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tabular-nums">{Number(entry.profitSharePercentage)}%</span>
                          <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, Number(entry.profitSharePercentage))}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(entry.totalInvestment)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-success">
                        {formatCurrency(entry.profitShare)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-destructive">
                        −{formatCurrency(entry.expenseShare)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold tabular-nums',
                          Number(entry.equity) < 0 ? 'text-destructive' : 'text-foreground',
                        )}
                      >
                        {formatCurrency(entry.equity)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-border bg-muted/50 hover:bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        Number(equity.totals.percentageTotal) !== 100 && 'text-destructive',
                      )}
                    >
                      {Number(equity.totals.percentageTotal)}%
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(equity.totals.totalInvestment)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-success">
                      {formatCurrency(equity.totals.totalProfit)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">
                      −{formatCurrency(equity.totals.totalExpenses)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        Number(equity.totals.totalEquity) < 0 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {formatCurrency(equity.totals.totalEquity)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 sm:hidden">
              {equity.entries.map((entry, i) => (
                <div key={entry.investorId} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          AVATAR_TONES[i % AVATAR_TONES.length],
                        )}
                      >
                        {initials(entry.investorName)}
                      </div>
                      <span className="break-words font-medium">{entry.investorName}</span>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {Number(entry.profitSharePercentage)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Number(entry.profitSharePercentage))}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Investment</p>
                      <p className="break-words font-medium tabular-nums">{formatCurrency(entry.totalInvestment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit Share</p>
                      <p className="break-words font-medium tabular-nums text-success">
                        {formatCurrency(entry.profitShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expense Share</p>
                      <p className="break-words font-medium tabular-nums text-destructive">
                        −{formatCurrency(entry.expenseShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Equity</p>
                      <p
                        className={cn(
                          'break-words font-semibold tabular-nums',
                          Number(entry.equity) < 0 ? 'text-destructive' : 'text-foreground',
                        )}
                      >
                        {formatCurrency(entry.equity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-sm font-semibold tabular-nums">{Number(equity.totals.percentageTotal)}%</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Investment</p>
                    <p className="break-words font-semibold tabular-nums">
                      {formatCurrency(equity.totals.totalInvestment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit Share</p>
                    <p className="break-words font-semibold tabular-nums text-success">
                      {formatCurrency(equity.totals.totalProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expense Share</p>
                    <p className="break-words font-semibold tabular-nums text-destructive">
                      −{formatCurrency(equity.totals.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equity</p>
                    <p
                      className={cn(
                        'break-words font-semibold tabular-nums',
                        Number(equity.totals.totalEquity) < 0 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {formatCurrency(equity.totals.totalEquity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-border px-4 py-3 sm:px-5">
              {Number(equity.totals.percentageTotal) !== 100 && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
                >
                  Warning: profit share percentages sum to {Number(equity.totals.percentageTotal)}%, not 100%.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                &quot;Profit share&quot; is each investor&apos;s cut of gross profit computed live from{' '}
                <Link href="/admin/sales-analysis" className="font-medium text-primary hover:underline">
                  Sales Analysis
                </Link>{' '}
                (all completed orders to date), weighted by their profit share %.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="History"
          description={
            <>
              Every investment, withdrawal, and expense affecting equity.
              <span className="hidden sm:inline">
                {' '}
                Manage them from the{' '}
                <Link href="/admin/investments" className="font-medium text-primary hover:underline">
                  Investments
                </Link>{' '}
                and{' '}
                <Link href="/admin/expenses" className="font-medium text-primary hover:underline">
                  Expenses
                </Link>{' '}
                pages.
              </span>
            </>
          }
          isFetching={historyFetching && !historyLoading}
          className="pb-3"
        />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[16rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search description or investor..."
              value={search}
              onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => resetPageAnd(setTypeFilter)(value as 'all' | HistoryType)}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="INVESTMENT">Investment</SelectItem>
              <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={investorFilter} onValueChange={resetPageAnd(setInvestorFilter)}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All Investors" />
            </SelectTrigger>
            <SelectContent searchable searchPlaceholder="Search investors…">
              <SelectItem value="all">All Investors</SelectItem>
              {investorOptions.map((entry) => (
                <SelectItem key={entry.investorId} value={entry.investorId}>
                  {entry.investorName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
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
              icon={PieChart}
              title="No history yet"
              description="Investments and expenses will appear here"
            />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', historyFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => {
                    const meta = TYPE_META[row.type];
                    const Icon = meta.icon;
                    const amount = Number(row.amount);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-normal break-words tabular-nums text-muted-foreground">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={meta.badge}>
                            <Icon className="shrink-0" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[12rem] whitespace-normal break-words">{row.description}</TableCell>
                        <TableCell className="whitespace-normal break-words">{row.investorName ?? '—'}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium tabular-nums',
                            amount >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {amount >= 0 ? '+' : ''}
                          {formatCurrency(amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', historyFetching && 'opacity-60 transition-opacity')}>
              {history.map((row) => {
                const meta = TYPE_META[row.type];
                const Icon = meta.icon;
                const amount = Number(row.amount);
                return (
                  <div key={row.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={meta.badge}>
                        <Icon className="shrink-0" />
                        {meta.label}
                      </Badge>
                      <span
                        className={cn(
                          'shrink-0 break-words font-medium tabular-nums',
                          amount >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {amount >= 0 ? '+' : ''}
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium">{row.description}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{formatDate(row.date)}</span>
                      <span className="break-words text-right">{row.investorName ?? '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={historyResult?.meta} onPageChange={setHistoryPage} />
          </>
        )}
      </div>

      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent className="max-w-2xl" title="Investor Breakdown">
          <DialogHeader>
            <DialogTitle>Investor Breakdown</DialogTitle>
            <DialogDescription>Ledger entries behind each investor&apos;s current equity.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            {(equity?.entries ?? []).map((entry, i) => {
              const ledger = investmentsByInvestor.get(entry.investorId) ?? [];
              return (
                <div key={entry.investorId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          AVATAR_TONES[i % AVATAR_TONES.length],
                        )}
                      >
                        {initials(entry.investorName)}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-medium">{entry.investorName}</p>
                        <p className="text-xs text-muted-foreground">{Number(entry.profitSharePercentage)}% share</p>
                      </div>
                    </div>
                    <p className="shrink-0 break-words text-right font-semibold text-primary">
                      {formatCurrency(entry.equity)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Investment</p>
                      <p className="break-words font-medium">{formatCurrency(entry.totalInvestment)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Profit Share</p>
                      <p className="break-words font-medium text-success">{formatCurrency(entry.profitShare)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-muted-foreground">Expense Share</p>
                      <p className="break-words font-medium text-destructive">−{formatCurrency(entry.expenseShare)}</p>
                    </div>
                  </div>
                  {ledger.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {ledger.map((investment) => (
                        <div key={investment.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="min-w-0 break-words text-muted-foreground">
                            {formatDate(investment.investmentDate)} · {investment.reason}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 font-medium',
                              Number(investment.amount) >= 0 ? 'text-success' : 'text-destructive',
                            )}
                          >
                            {Number(investment.amount) >= 0 ? '+' : ''}
                            {formatCurrency(investment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {i < (equity?.entries.length ?? 0) - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
