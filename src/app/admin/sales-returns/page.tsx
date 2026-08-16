'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  PackageCheck,
  Receipt,
  Search,
  Undo2,
  User,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesReturns } from '@/hooks/use-sales-returns';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SalesReturn } from '@/lib/api/types';

function ItemsBreakdown({ salesReturn }: { salesReturn: SalesReturn }) {
  return (
    <div className="space-y-3 border-t border-border/50 bg-muted/20 p-4 sm:p-5 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <PackageCheck className="size-4 text-primary" />
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Returned Items Breakdown ({salesReturn.items.length})
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60 backdrop-blur-md">
        <Table className="text-xs">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent border-border/60">
              <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Product
              </TableHead>
              <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Returned Qty
              </TableHead>
              <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Wholesale Price
              </TableHead>
              <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Discount Deducted
              </TableHead>
              <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                Net Refund Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {salesReturn.items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-bold text-xs text-foreground">
                  {item.product?.name ?? item.productId}
                </TableCell>
                <TableCell className="text-right font-extrabold text-xs text-foreground">
                  {item.quantity} units
                </TableCell>
                <TableCell className="text-right font-medium text-xs text-muted-foreground">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-bold text-xs',
                    Number(item.allocatedDiscount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                  )}
                >
                  {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                </TableCell>
                <TableCell className="text-right font-black text-xs text-rose-600 dark:text-rose-400">
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
    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Returned Line Items</p>
      {salesReturn.items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-2 text-xs rounded-xl bg-background/50 p-2 border border-border/50">
          <div className="min-w-0">
            <p className="font-bold text-foreground text-xs truncate">{item.product?.name ?? item.productId}</p>
            <p className="text-[10px] text-muted-foreground font-medium">
              {item.quantity} units &times; {formatCurrency(item.unitPrice)}
              {Number(item.allocatedDiscount) > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-bold"> (−{formatCurrency(item.allocatedDiscount)} disc)</span>
              )}
            </p>
          </div>
          <span className="shrink-0 font-black text-rose-600 dark:text-rose-400 text-xs">
            {formatCurrency(item.lineTotal)}
          </span>
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
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs">
              <Undo2 className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Sales Returns Register
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Track product returns from dealers with automatic stock restocking and dealer credit note adjustments
          </p>
        </div>
      </div>

      {/* 3 Quick Return KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* KPI 1: Total Returned Value */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Returns Value
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totalReturnedValue)}
          </div>
        </div>

        {/* KPI 2: Return Cases */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Return Records
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Undo2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : totalReturnCases}
          </div>
        </div>

        {/* KPI 3: Avg Return Value */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Avg Refund Per Return
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(avgReturnValue)}
          </div>
        </div>
      </div>

      {/* Main Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all">
        {/* Specular Shimmer Top Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="Sales Returns Register" isFetching={isFetching && !isLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search return # or dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-semibold"
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

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching returns"
              description="Try adjusting or clearing your search term"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Undo2} title="No sales returns recorded yet" description="Returned dealer items will display here with full line item breakdowns" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', isFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="w-8" />
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Return Date
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Return #
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Original Order
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Dealer Customer
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Reason / Notes
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Items
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Total Refund
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {data.data.map((salesReturn) => {
                      const isExpanded = expanded.has(salesReturn.id);
                      return (
                        <Fragment key={salesReturn.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleExpanded(salesReturn.id)}
                          >
                            <TableCell className="w-8">
                              <div className="flex size-7 items-center justify-center rounded-lg bg-muted border border-border/60">
                                {isExpanded ? (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="size-4 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="size-3 text-muted-foreground/70" />
                                {formatDate(salesReturn.returnDate)}
                              </span>
                            </TableCell>
                            <TableCell className="font-black text-xs text-foreground">
                              {salesReturn.returnNumber}
                            </TableCell>
                            <TableCell>
                              {salesReturn.order ? (
                                <Link
                                  href={`/admin/orders/${salesReturn.order.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                                >
                                  <span>{salesReturn.order.orderNumber}</span>
                                  <ArrowUpRight className="size-3" />
                                </Link>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex size-7 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-[10px] shrink-0">
                                  {(salesReturn.dealer?.businessName ?? '—').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-xs text-foreground truncate">
                                  {salesReturn.dealer?.businessName ?? '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground max-w-xs break-words">
                              {salesReturn.reason}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-foreground">
                              {salesReturn.items.length} item{salesReturn.items.length === 1 ? '' : 's'}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs sm:text-sm text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              −{formatCurrency(salesReturn.totalAmount)}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={8} className="p-0">
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
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((salesReturn) => {
                const isExpanded = expanded.has(salesReturn.id);
                return (
                  <div
                    key={salesReturn.id}
                    className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs cursor-pointer"
                    onClick={() => toggleExpanded(salesReturn.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-foreground">{salesReturn.returnNumber}</span>
                        {salesReturn.order && (
                          <Link
                            href={`/admin/orders/${salesReturn.order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded-xl bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary border border-primary/20"
                          >
                            {salesReturn.order.orderNumber}
                          </Link>
                        )}
                      </div>

                      <span className="font-black text-xs text-rose-600 dark:text-rose-400">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-foreground">{salesReturn.reason}</p>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="size-3 text-muted-foreground/70" />
                        <span className="font-bold text-foreground truncate">{salesReturn.dealer?.businessName ?? '—'}</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(salesReturn.returnDate)}
                      </span>
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
