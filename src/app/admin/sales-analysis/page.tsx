'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  LineChart,
  Loader2,
  PiggyBank,
  Receipt,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useSalesAnalysis, useSalesAnalysisSummary } from '@/hooks/use-sales-analysis';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { downloadCsv } from '@/lib/csv';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SalesAnalysisRow } from '@/lib/api/types';

function downloadSalesAnalysisCsv(filename: string, rows: SalesAnalysisRow[]) {
  const header = ['Order #', 'Invoice #', 'Dealer', 'Date', 'Selling Price', 'Buying Price', 'Profit'];
  downloadCsv(
    filename,
    header,
    rows.map((row) => [
      row.orderNumber,
      row.invoiceNumber ?? '—',
      row.dealerName,
      row.date ? formatDate(row.date) : '—',
      row.sellingPrice,
      row.buyingPrice,
      row.profit,
    ]),
  );
}

export default function SalesAnalysisPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dealerId, setDealerId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { data: dealers } = useAllCustomer();

  const filters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    dealerId: dealerId === 'all' ? undefined : dealerId,
    search: debouncedSearch || undefined,
  };
  const filtersActive = !!dateFrom || !!dateTo || dealerId !== 'all' || !!search;

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setDealerId('all');
    setSearch('');
    setPage(1);
  }

  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    isError: summaryError,
    error: summaryErrorObj,
    refetch: refetchSummary,
  } = useSalesAnalysisSummary(filters);

  const {
    data: rows,
    isLoading: rowsLoading,
    isFetching: rowsFetching,
    isError: rowsError,
    error: rowsErrorObj,
    refetch: refetchRows,
  } = useSalesAnalysis({ ...filters, page, limit: 20 });

  async function handleExport() {
    setIsExporting(true);
    try {
      const allRows = await fetchAllPages((page, limit) => api.salesAnalysis.list({ ...filters, page, limit }));
      downloadSalesAnalysisCsv(`sales-analysis-${new Date().toISOString().slice(0, 10)}.csv`, allRows);
    } finally {
      setIsExporting(false);
    }
  }

  const isNetProfitPositive = Number(summary?.netProfit ?? 0) >= 0;

  return (
    <div className="space-y-6 select-none">
      {/* Page Title & Export Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <LineChart className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Sales Analysis &amp; Profitability
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Net profit breakdown per delivered order — selling price minus buying price, minus operating expenses
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!rows || rows.data.length === 0 || isExporting}
          className="rounded-2xl font-semibold backdrop-blur-md shrink-0 h-10 shadow-xs"
        >
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span>Export CSV Report</span>
        </Button>
      </div>

      {/* 5 Executive High-Density Metric Summary Pods */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : summaryError ? (
        <QueryErrorState error={summaryErrorObj} onRetry={() => refetchSummary()} />
      ) : (
        summary && (
          <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5', summaryFetching && 'opacity-60 transition-opacity')}>
            {/* Metric 1: Total Sales */}
            <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Total Sales Revenue
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShoppingBag className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-foreground">
                {formatCurrency(summary.totalSales)}
              </div>
            </div>

            {/* Metric 2: Buying Cost */}
            <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Total Buying Cost
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <TrendingDown className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-foreground">
                {formatCurrency(summary.totalBuying)}
              </div>
            </div>

            {/* Metric 3: Gross Profit */}
            <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Gross Profit
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalProfit)}
              </div>
            </div>

            {/* Metric 4: Total Expenses */}
            <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Total Expenses
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Receipt className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black tracking-tight text-foreground">
                {formatCurrency(summary.totalExpenses)}
              </div>
            </div>

            {/* Metric 5: Net Profit Hero Pod */}
            <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Net Profit (Bottom Line)
                </span>
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-xl border',
                    isNetProfitPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  )}
                >
                  <PiggyBank className="size-4" />
                </div>
              </div>
              <div
                className={cn(
                  'mt-2 text-xl font-black tracking-tight',
                  isNetProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {formatCurrency(summary.netProfit)}
              </div>
            </div>
          </div>
        )
      )}

      {/* Main Liquid Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all select-none">
        {/* Specular Shimmer Top Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="Delivered Orders &amp; Profit Analysis" isFetching={rowsFetching && !rowsLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, invoice, dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md"
            />
          </div>

          <Select
            value={dealerId}
            onValueChange={(v) => {
              setDealerId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold text-xs">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/60 shadow-xl">
              <SelectItem value="all">All Customers</SelectItem>
              {dealers?.data.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <span className="text-xs font-bold text-muted-foreground">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full sm:w-36 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <span className="text-xs font-bold text-muted-foreground">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full sm:w-36 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
            />
          </div>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="rounded-full text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </FilterBar>

        {rowsLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : rowsError ? (
          <QueryErrorState error={rowsErrorObj} onRetry={() => refetchRows()} />
        ) : !rows || rows.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching sales records"
              description="Try adjusting or clearing your search term and date range filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={LineChart} title="No delivered orders recorded" description="Delivered customer orders will automatically calculate sales profits here" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', rowsFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Order #
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Invoice #
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Customer / Dealer
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Date
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Selling Price
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Buying Cost
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Order Gross Profit
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {rows.data.map((row) => {
                      const isProfitPositive = Number(row.profit) >= 0;
                      return (
                        <TableRow key={row.orderId} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Link
                              href={`/admin/orders/${row.orderId}`}
                              className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              {row.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.invoiceNumber ? `#${row.invoiceNumber}` : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex size-7 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-[10px]">
                                {row.dealerName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-xs text-foreground">{row.dealerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {row.date ? formatDate(row.date) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-foreground text-xs sm:text-sm">
                            {formatCurrency(row.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-muted-foreground text-xs sm:text-sm">
                            {formatCurrency(row.buyingPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-extrabold border shadow-2xs',
                                isProfitPositive
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              )}
                            >
                              {formatCurrency(row.profit)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', rowsFetching && 'opacity-60 transition-opacity')}>
              {rows.data.map((row) => {
                const isProfitPositive = Number(row.profit) >= 0;
                return (
                  <div
                    key={row.orderId}
                    className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20"
                      >
                        {row.orderNumber}
                      </Link>
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3" />
                        {row.date ? formatDate(row.date) : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-[10px]">
                        {row.dealerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">{row.dealerName}</p>
                        {row.invoiceNumber && (
                          <p className="font-mono text-[10px] text-muted-foreground">Invoice #{row.invoiceNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2.5 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selling Price</p>
                        <p className="font-extrabold text-foreground">{formatCurrency(row.sellingPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Buying Cost</p>
                        <p className="font-semibold text-muted-foreground">{formatCurrency(row.buyingPrice)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Profit</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-extrabold border',
                          isProfitPositive
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        )}
                      >
                        {formatCurrency(row.profit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={rows.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
