'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, DollarSign, PackageCheck, Receipt, Search, Undo2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesReturns } from '@/hooks/use-sales-returns';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SalesReturn } from '@/lib/api/types';

function ItemsBreakdown({ salesReturn }: { salesReturn: SalesReturn }) {
  return (
    <div className="space-y-3 border-t border-border bg-muted/30 p-4 sm:px-5">
      <div className="flex items-center gap-2">
        <PackageCheck className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">
          Returned items ({salesReturn.items.length})
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Returned Qty</TableHead>
              <TableHead className="text-right">Wholesale Price</TableHead>
              <TableHead className="text-right">Discount Deducted</TableHead>
              <TableHead className="text-right">Net Refund Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salesReturn.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product?.name ?? item.productId}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity} units</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    Number(item.allocatedDiscount) > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-destructive">
                  {formatCurrency(item.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ItemsBreakdownMobile({ salesReturn }: { salesReturn: SalesReturn }) {
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground">Returned items</p>
      {salesReturn.items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.product?.name ?? item.productId}</p>
            <p className="text-muted-foreground tabular-nums">
              {item.quantity} units &times; {formatCurrency(item.unitPrice)}
              {Number(item.allocatedDiscount) > 0 && (
                <span className="text-destructive"> (−{formatCurrency(item.allocatedDiscount)} disc)</span>
              )}
            </p>
          </div>
          <span className="shrink-0 font-medium tabular-nums text-destructive">{formatCurrency(item.lineTotal)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalesReturnsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search;

  const { data, isLoading, isFetching, isError, error, refetch } = useSalesReturns({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch('');
    setPage(1);
  }

  // Summary Metrics Calculations
  const returnsList = data?.data ?? [];
  const totalReturnCases = data?.meta?.total ?? 0;
  const totalReturnedValue = returnsList.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const avgReturnValue = totalReturnCases > 0 ? totalReturnedValue / Math.min(returnsList.length, totalReturnCases) : 0;

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Sales Returns"
        description="Product returns from dealers, with automatic restocking and dealer credit adjustments."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Returns Value"
          value={isLoading ? '—' : formatCurrency(totalReturnedValue)}
          icon={DollarSign}
          tone="destructive"
        />
        <StatCard label="Return Records" value={isLoading ? '—' : totalReturnCases} icon={Undo2} tone="warning" />
        <StatCard
          label="Avg Refund Per Return"
          value={isLoading ? '—' : formatCurrency(avgReturnValue)}
          icon={Receipt}
          tone="info"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Returns register"
          description="Click a row to see its returned line items."
          isFetching={isFetching && !isLoading}
          className="pb-3"
        />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search return # or dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-3.5" />
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching returns"
              description="Try adjusting or clearing your search term"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Undo2}
              title="No sales returns recorded yet"
              description="Returned dealer items will display here with full line item breakdowns"
            />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Return Date</TableHead>
                    <TableHead>Return #</TableHead>
                    <TableHead>Original Order</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((salesReturn) => {
                    const isExpanded = expanded.has(salesReturn.id);
                    return (
                      <Fragment key={salesReturn.id}>
                        <TableRow
                          className={cn('cursor-pointer', isExpanded && 'bg-muted/40')}
                          onClick={() => toggleExpanded(salesReturn.id)}
                        >
                          <TableCell className="w-8 pr-0">
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(salesReturn.returnDate)}</TableCell>
                          <TableCell className="font-medium">{salesReturn.returnNumber}</TableCell>
                          <TableCell>
                            {salesReturn.order ? (
                              <Link
                                href={`/admin/orders/${salesReturn.order.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-primary hover:underline"
                              >
                                {salesReturn.order.orderNumber}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="max-w-[14rem] truncate">
                            {salesReturn.dealer?.businessName ?? '—'}
                          </TableCell>
                          <TableCell className="max-w-xs whitespace-normal break-words text-muted-foreground">
                            {salesReturn.reason}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {salesReturn.items.length} item{salesReturn.items.length === 1 ? '' : 's'}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-destructive">
                            −{formatCurrency(salesReturn.totalAmount)}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={8} className="whitespace-normal p-0">
                              <ItemsBreakdown salesReturn={salesReturn} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((salesReturn) => {
                const isExpanded = expanded.has(salesReturn.id);
                return (
                  <div
                    key={salesReturn.id}
                    className="cursor-pointer space-y-2 rounded-lg border border-border bg-card p-4"
                    onClick={() => toggleExpanded(salesReturn.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{salesReturn.returnNumber}</span>
                        {salesReturn.order && (
                          <Link
                            href={`/admin/orders/${salesReturn.order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {salesReturn.order.orderNumber}
                          </Link>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-destructive">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground">{salesReturn.reason}</p>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-medium text-foreground">
                        {salesReturn.dealer?.businessName ?? '—'}
                      </span>
                      <span className="shrink-0">{formatDate(salesReturn.returnDate)}</span>
                    </div>

                    {isExpanded && <ItemsBreakdownMobile salesReturn={salesReturn} />}
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
