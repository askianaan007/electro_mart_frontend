'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Download,
  LineChart,
  PiggyBank,
  Receipt,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
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
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
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
      <PageHeader
        title="Sales Analysis & Profitability"
        description="Net profit breakdown per delivered order — selling price minus buying price, minus operating expenses."
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!rows || rows.data.length === 0 || isExporting}
            loading={isExporting}
          >
            {!isExporting && <Download />}
            Export CSV
          </Button>
        }
      />

      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[108px] rounded-xl" />
          ))}
        </div>
      ) : summaryError ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={summaryErrorObj} onRetry={() => refetchSummary()} />
        </div>
      ) : (
        summary && (
          <div
            className={cn(
              'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
              summaryFetching && 'opacity-60 transition-opacity',
            )}
          >
            <StatCard label="Total sales revenue" value={formatCurrency(summary.totalSales)} icon={ShoppingBag} tone="default" />
            <StatCard label="Total buying cost" value={formatCurrency(summary.totalBuying)} icon={TrendingDown} tone="purple" />
            <StatCard label="Gross profit" value={formatCurrency(summary.totalProfit)} icon={TrendingUp} tone="success" />
            <StatCard label="Total expenses" value={formatCurrency(summary.totalExpenses)} icon={Receipt} tone="warning" />
            <StatCard
              label="Net profit"
              value={formatCurrency(summary.netProfit)}
              icon={PiggyBank}
              tone={isNetProfitPositive ? 'success' : 'destructive'}
              hint="Bottom line after expenses"
              className="sm:col-span-2 lg:col-span-1"
              valueClassName={isNetProfitPositive ? 'text-success' : 'text-destructive'}
            />
          </div>
        )
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Delivered orders & profit"
          description="One row per delivered order."
          isFetching={rowsFetching && !rowsLoading}
          className="pb-3"
        />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, invoice, dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            value={dealerId}
            onValueChange={(v) => {
              setDealerId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {dealers?.data.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}
        </FilterBar>

        {rowsLoading ? (
          <TableSkeleton rows={6} />
        ) : rowsError ? (
          <QueryErrorState error={rowsErrorObj} onRetry={() => refetchRows()} />
        ) : !rows || rows.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching sales records"
              description="Try adjusting or clearing your search term and date range filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={LineChart}
              title="No delivered orders recorded"
              description="Delivered customer orders will automatically calculate sales profits here"
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn('hidden sm:block', rowsFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer / Dealer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Buying Cost</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.data.map((row) => {
                    const isProfitPositive = Number(row.profit) >= 0;
                    return (
                      <TableRow key={row.orderId}>
                        <TableCell>
                          <Link href={`/admin/orders/${row.orderId}`} className="font-medium text-primary hover:underline">
                            {row.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.invoiceNumber ? `#${row.invoiceNumber}` : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{row.dealerName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.date ? formatDate(row.date) : '—'}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(row.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(row.buyingPrice)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-semibold tabular-nums',
                            isProfitPositive ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {formatCurrency(row.profit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className={cn('space-y-3 p-4 sm:hidden', rowsFetching && 'opacity-60 transition-opacity')}>
              {rows.data.map((row) => {
                const isProfitPositive = Number(row.profit) >= 0;
                return (
                  <div key={row.orderId} className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/orders/${row.orderId}`} className="text-sm font-medium text-primary hover:underline">
                        {row.orderNumber}
                      </Link>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="size-3" />
                        {row.date ? formatDate(row.date) : '—'}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">{row.dealerName}</p>
                      {row.invoiceNumber && (
                        <p className="font-mono text-xs text-muted-foreground">Invoice #{row.invoiceNumber}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border pt-2.5 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Selling price</p>
                        <p className="font-medium tabular-nums">{formatCurrency(row.sellingPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Buying cost</p>
                        <p className="tabular-nums text-muted-foreground">{formatCurrency(row.buyingPrice)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2.5">
                      <span className="text-xs text-muted-foreground">Order profit</span>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          isProfitPositive ? 'text-success' : 'text-destructive',
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
