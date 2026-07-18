'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  LineChart,
  Loader2,
  PiggyBank,
  Receipt,
  Search,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Net profit per delivered order — selling price minus buying price, minus expenses. Gross profit here
            feeds Equity&apos;s profit share automatically.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!rows || rows.data.length === 0 || isExporting}
          className="shrink-0"
        >
          {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
          Export
        </Button>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : summaryError ? (
        <QueryErrorState error={summaryErrorObj} onRetry={() => refetchSummary()} />
      ) : (
        summary && (
          <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-5', summaryFetching && 'opacity-60 transition-opacity')}>
            <StatCard label="Total Sales" value={formatCurrency(summary.totalSales)} icon={ShoppingBag} />
            <StatCard label="Total Buying Price" value={formatCurrency(summary.totalBuying)} icon={TrendingDown} />
            <StatCard label="Gross Profit" value={formatCurrency(summary.totalProfit)} icon={TrendingUp} tone="success" />
            <StatCard label="Total Expenses" value={formatCurrency(summary.totalExpenses)} icon={Receipt} />
            <StatCard
              label="Net Profit"
              value={formatCurrency(summary.netProfit)}
              icon={PiggyBank}
              tone={Number(summary.netProfit) >= 0 ? 'success' : 'destructive'}
            />
          </div>
        )
      )}

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="Orders" isFetching={rowsFetching && !rowsLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-48">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order # or dealer..."
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
              <SelectValue placeholder="All customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customer</SelectItem>
              {dealers?.data.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
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
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {rowsLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rowsError ? (
          <QueryErrorState error={rowsErrorObj} onRetry={() => refetchRows()} />
        ) : !rows || rows.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching orders"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={LineChart} title="No delivered orders in this range" description="Completed orders will appear here" />
          )
        ) : (
          <>
            <div className={cn(rowsFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Buying Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.data.map((row) => (
                    <TableRow key={row.orderId}>
                      <TableCell>
                        <Link href={`/admin/orders/${row.orderId}`} className="font-medium text-primary">
                          {row.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{row.invoiceNumber ?? '—'}</TableCell>
                      <TableCell>{row.dealerName}</TableCell>
                      <TableCell>{row.date ? formatDate(row.date) : '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.sellingPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.buyingPrice)}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          Number(row.profit) >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {formatCurrency(row.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar meta={rows.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
