'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  Coins,
  Download,
  Filter as FilterIcon,
  History,
  Info,
  Layers,
  MinusCircle,
  PieChart,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
import { useEquitySummary } from '@/hooks/use-equity';
import { useInvestments } from '@/hooks/use-investments';
import { useExpenses } from '@/hooks/use-expenses';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';
import type { Investment } from '@/lib/api/types';

type HistoryType = 'Investment' | 'Withdrawal' | 'Expense';

type HistoryRow = {
  id: string;
  date: string;
  type: HistoryType;
  description: string;
  who: string;
  investorId: string | null;
  amount: number;
};

const AVATAR_TONES = [
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/20 text-warning-foreground',
  'bg-destructive/15 text-destructive',
];

const TYPE_META: Record<HistoryType, { label: string; icon: typeof ArrowDownCircle; className: string }> = {
  Investment: { label: 'Investment', icon: ArrowDownCircle, className: 'text-success' },
  Withdrawal: { label: 'Withdrawal', icon: ArrowUpCircle, className: 'text-destructive' },
  Expense: { label: 'Expense', icon: MinusCircle, className: 'text-destructive' },
};

function toCsvValue(value: string | number) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadHistoryCsv(filename: string, rows: HistoryRow[]) {
  const header = ['Date', 'Type', 'Description', 'Investor', 'Amount'];
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [formatDate(row.date), row.type, row.description, row.who, row.amount.toFixed(2)].map(toCsvValue).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function EquityPage() {
  const { data: equity, isLoading: equityLoading } = useEquitySummary();
  const { data: investments, isLoading: investmentsLoading } = useInvestments({ page: 1, limit: 50 });
  const { data: expenses, isLoading: expensesLoading } = useExpenses({ page: 1, limit: 50 });

  const historyLoading = investmentsLoading || expensesLoading;

  const [typeFilter, setTypeFilter] = useState<'all' | HistoryType>('all');
  const [investorFilter, setInvestorFilter] = useState('all');
  const [quickDate, setQuickDate] = useState('all');
  const [showRange, setShowRange] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const history: HistoryRow[] = useMemo(
    () =>
      [
        ...(investments?.data ?? []).map((investment) => ({
          id: `investment-${investment.id}`,
          date: investment.investmentDate,
          type: (Number(investment.amount) < 0 ? 'Withdrawal' : 'Investment') as HistoryType,
          description: investment.reason,
          who: investment.investor?.name ?? '—',
          investorId: investment.investorId,
          amount: Number(investment.amount),
        })),
        ...(expenses?.data ?? []).map((expense) => ({
          id: `expense-${expense.id}`,
          date: expense.expenseDate,
          type: 'Expense' as HistoryType,
          description: expense.description,
          who: '—',
          investorId: null,
          amount: -Number(expense.amount),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [investments, expenses],
  );

  const investmentsByInvestor = useMemo(() => {
    const map = new Map<string, Investment[]>();
    for (const investment of investments?.data ?? []) {
      const list = map.get(investment.investorId) ?? [];
      list.push(investment);
      map.set(investment.investorId, list);
    }
    return map;
  }, [investments]);

  const distinctDates = useMemo(() => {
    const seen = new Set<string>();
    for (const row of history) seen.add(row.date.slice(0, 10));
    return Array.from(seen).sort((a, b) => (a < b ? 1 : -1));
  }, [history]);

  const filteredHistory = useMemo(
    () =>
      history.filter((row) => {
        if (typeFilter !== 'all' && row.type !== typeFilter) return false;
        if (investorFilter !== 'all' && row.investorId !== investorFilter) return false;
        const day = row.date.slice(0, 10);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
        return true;
      }),
    [history, typeFilter, investorFilter, dateFrom, dateTo],
  );

  const visibleHistory = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);
  const filtersActive = typeFilter !== 'all' || investorFilter !== 'all' || !!dateFrom || !!dateTo;
  const investorOptions = equity?.entries ?? [];

  function handleQuickDateChange(value: string) {
    setQuickDate(value);
    setShowAllHistory(false);
    if (value === 'all') {
      setDateFrom('');
      setDateTo('');
    } else {
      setDateFrom(value);
      setDateTo(value);
    }
  }

  function clearRange() {
    setDateFrom('');
    setDateTo('');
    setQuickDate('all');
  }

  function clearAllFilters() {
    setTypeFilter('all');
    setInvestorFilter('all');
    clearRange();
  }

  function handleExport() {
    downloadHistoryCsv(`equity-history-${new Date().toISOString().slice(0, 10)}.csv`, filteredHistory);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PieChart className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Equity</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Investment + profit share − expense share, per investor.
            </p>
            <p className="text-sm text-muted-foreground">
              Profit is calculated automatically from every completed sale — no manual entry needed.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={quickDate} onValueChange={handleQuickDateChange}>
            <SelectTrigger className="w-[9.5rem]">
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              {distinctDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatDate(date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={filteredHistory.length === 0}>
            <Download />
            Export
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        {equityLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          equity && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                hint="Current total equity"
              />
            </div>
          )
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 sm:pb-0">
          <h2 className="text-lg font-medium">Investor Equity Overview</h2>
          {equity && equity.entries.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setBreakdownOpen(true)}>
              <Layers />
              View Breakdown
            </Button>
          )}
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {equityLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !equity || equity.entries.length === 0 ? (
            <EmptyState icon={PieChart} title="No investors yet" description="Add investors under the Investments page" />
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                      <TableHead className="text-right">Investment</TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          Profit Share
                          <span title="Each investor's cut of gross profit computed live from Sales Analysis, weighted by their profit share %.">
                            <Info className="size-3.5 text-muted-foreground" />
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          Expense Share
                          <span title="Each investor's cut of total expenses, weighted by their profit share %.">
                            <Info className="size-3.5 text-muted-foreground" />
                          </span>
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Equity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equity.entries.map((entry, i) => (
                      <TableRow key={entry.investorId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
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
                            <span>{Number(entry.profitSharePercentage)}%</span>
                            <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, Number(entry.profitSharePercentage))}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-right">
                          {formatCurrency(entry.totalInvestment)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-right text-success">
                          {formatCurrency(entry.profitShare)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-right text-destructive">
                          −{formatCurrency(entry.expenseShare)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-right font-semibold text-primary">
                          {formatCurrency(entry.equity)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{Number(equity.totals.percentageTotal)}%</TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-semibold">
                        {formatCurrency(equity.totals.totalInvestment)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-semibold text-success">
                        {formatCurrency(equity.totals.totalProfit)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-semibold text-destructive">
                        −{formatCurrency(equity.totals.totalExpenses)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-semibold text-primary">
                        {formatCurrency(equity.totals.totalEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 sm:hidden">
                {equity.entries.map((entry, i) => (
                  <div key={entry.investorId} className="rounded-lg border border-border p-4">
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
                      <span className="shrink-0 text-sm text-muted-foreground">
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
                        <p className="break-words font-medium">{formatCurrency(entry.totalInvestment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit Share</p>
                        <p className="break-words font-medium text-success">{formatCurrency(entry.profitShare)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expense Share</p>
                        <p className="break-words font-medium text-destructive">−{formatCurrency(entry.expenseShare)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Equity</p>
                        <p className="break-words font-semibold text-primary">{formatCurrency(entry.equity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Total</span>
                    <span className="text-sm font-semibold">{Number(equity.totals.percentageTotal)}%</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Investment</p>
                      <p className="break-words font-semibold">{formatCurrency(equity.totals.totalInvestment)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profit Share</p>
                      <p className="break-words font-semibold text-success">{formatCurrency(equity.totals.totalProfit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expense Share</p>
                      <p className="break-words font-semibold text-destructive">
                        −{formatCurrency(equity.totals.totalExpenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Equity</p>
                      <p className="break-words font-semibold text-primary">{formatCurrency(equity.totals.totalEquity)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {Number(equity.totals.percentageTotal) !== 100 && (
                <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
                  Warning: profit share percentages sum to {Number(equity.totals.percentageTotal)}%, not 100%.
                </p>
              )}

              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground sm:text-sm">
                &quot;Profit share&quot; is each investor&apos;s cut of gross profit computed live from{' '}
                <Link href="/admin/sales-analysis" className="text-primary hover:underline">
                  Sales Analysis
                </Link>{' '}
                (all completed orders to date), weighted by their profit share %.
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-4 sm:p-6 sm:pb-0">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-medium">History</h2>
              <p className="text-sm text-muted-foreground">
                Every investment, withdrawal, and expense affecting equity. Manage them from the{' '}
                <Link href="/admin/investments" className="text-primary hover:underline">
                  Investments
                </Link>{' '}
                and{' '}
                <Link href="/admin/expenses" className="text-primary hover:underline">
                  Expenses
                </Link>{' '}
                pages.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as 'all' | HistoryType);
                  setShowAllHistory(false);
                }}
              >
                <SelectTrigger className="w-[9.5rem]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={investorFilter}
                onValueChange={(value) => {
                  setInvestorFilter(value);
                  setShowAllHistory(false);
                }}
              >
                <SelectTrigger className="w-[9.5rem]">
                  <SelectValue placeholder="All Investors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investors</SelectItem>
                  {investorOptions.map((entry) => (
                    <SelectItem key={entry.investorId} value={entry.investorId}>
                      {entry.investorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setShowRange((v) => !v)}>
                <FilterIcon />
                Filter
                {filtersActive && <span className="size-1.5 rounded-full bg-primary" />}
              </Button>
            </div>
          </div>

          {showRange && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <span className="text-xs font-medium text-muted-foreground">Date range:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setQuickDate('all');
                  setShowAllHistory(false);
                }}
                className="w-auto"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setQuickDate('all');
                  setShowAllHistory(false);
                }}
                className="w-auto"
              />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearRange}>
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState icon={History} title="No history yet" description="Investments and expenses will appear here" />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={FilterIcon}
              title="No matching entries"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden sm:block">
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
                    {visibleHistory.map((row) => {
                      const meta = TYPE_META[row.type];
                      const Icon = meta.icon;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-normal break-words">{formatDate(row.date)}</TableCell>
                          <TableCell>
                            <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.className)}>
                              <Icon className="size-4 shrink-0" />
                              {meta.label}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">{row.description}</TableCell>
                          <TableCell className="whitespace-normal break-words">{row.who}</TableCell>
                          <TableCell
                            className={cn(
                              'whitespace-normal break-words text-right font-medium',
                              row.amount >= 0 ? 'text-success' : 'text-destructive',
                            )}
                          >
                            {row.amount >= 0 ? '+' : ''}
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 sm:hidden">
                {visibleHistory.map((row) => {
                  const meta = TYPE_META[row.type];
                  const Icon = meta.icon;
                  return (
                    <div key={row.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', meta.className)}>
                          <Icon className="size-4 shrink-0" />
                          {meta.label}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 break-words font-medium',
                            row.amount >= 0 ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {row.amount >= 0 ? '+' : ''}
                          {formatCurrency(row.amount)}
                        </span>
                      </div>
                      <p className="mt-2 break-words text-sm font-medium">{row.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(row.date)}</span>
                        <span className="break-words text-right">{row.who}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredHistory.length > 5 && (
                <div className="flex justify-center pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setShowAllHistory((v) => !v)}>
                    <ChevronDown className={cn('size-4 transition-transform', showAllHistory && 'rotate-180')} />
                    {showAllHistory ? 'Show Less' : 'View All History'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

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
