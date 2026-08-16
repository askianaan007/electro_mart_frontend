'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { OrderStatusBadge } from '@/components/status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrders, useResetOrderCounter } from '@/hooks/use-orders';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/api/types';

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

function orderTotals(order: Order) {
  const grossValue = Number(order.totalAmount);
  const returnedValue = (order.salesReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const netValue = grossValue - returnedValue;
  return { grossValue, returnedValue, netValue, hasReturns: returnedValue > 0 };
}

function ReturnedBadge({ netValue }: { netValue: number }) {
  return (
    <Badge
      variant={netValue <= 0 ? 'destructive' : 'warning'}
      className="rounded-full px-2 py-0 text-[10px] font-black uppercase tracking-wider shadow-2xs"
    >
      {netValue <= 0 ? 'Fully Returned' : 'Partially Returned'}
    </Badge>
  );
}

function AmountBreakdown({ order, className }: { order: Order; className?: string }) {
  const { grossValue, returnedValue, netValue, hasReturns } = orderTotals(order);

  if (!hasReturns) {
    return <span className={cn('font-black text-foreground text-xs sm:text-sm', className)}>{formatCurrency(grossValue)}</span>;
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(grossValue)}</span>
      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">−{formatCurrency(returnedValue)} returned</span>
      <span className="font-black text-xs sm:text-sm text-foreground">{formatCurrency(netValue)} net</span>
    </div>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || dealerFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data: dealers } = useAllCustomer();
  const resetCounter = useResetOrderCounter();

  const { data, isLoading, isFetching, isError, error, refetch } = useOrders({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : (status as OrderStatus),
    dealerId: dealerFilter === 'all' ? undefined : dealerFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setSearch('');
    setDealerFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function confirmResetCounter() {
    resetCounter.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Order counter reset — next order will be #${String(result.nextSerial).padStart(5, '0')}`);
        setResetOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setResetOpen(false);
      },
    });
  }

  // Summary counts for KPI cards
  const totalOrdersCount = data?.meta?.total ?? 0;
  const pendingCount = data?.data.filter((o) => o.status === 'PENDING_APPROVAL').length ?? 0;
  const inProgressCount = data?.data.filter((o) => o.status === 'APPROVED' || o.status === 'PACKED').length ?? 0;
  const completedCount = data?.data.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length ?? 0;

  return (
    <div className="space-y-6 select-none">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <ShoppingCart className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Orders Management
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Review dealer orders, approve incoming requests, track delivery status, and handle returns
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => setResetOpen(true)}
            className="rounded-2xl font-semibold backdrop-blur-md h-10 shadow-xs"
          >
            <RotateCcw className="size-4" />
            <span>Reset Counter</span>
          </Button>
          <Button asChild className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all h-10">
            <Link href="/admin/orders/new">
              <Plus className="size-4" />
              <span>New Order</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Quick Orders KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Orders */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Orders
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShoppingCart className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : totalOrdersCount}
          </div>
        </div>

        {/* KPI 2: Pending Approval */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Pending Approval
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : pendingCount}
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              In Packing / Shipping
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Truck className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : inProgressCount}
          </div>
        </div>

        {/* KPI 4: Delivered */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Delivered &amp; Completed
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : completedCount}
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl border border-border/60 bg-card/70 p-1.5 backdrop-blur-md h-auto gap-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md shrink-0"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Main Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all">
        {/* Specular Shimmer Top Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="Orders Register" isFetching={isFetching && !isLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md"
            />
          </div>

          <Select
            value={dealerFilter}
            onValueChange={(v) => {
              setDealerFilter(v);
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
              title="No matching orders"
              description="Try adjusting or clearing your search term and date range filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={ShoppingCart} title="No orders recorded" description="Dealer orders submitted to the system will display here" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', isFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Order #
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Customer / Dealer
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Order Date
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Total Amount
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {data.data.map((order) => {
                      const { hasReturns, netValue } = orderTotals(order);
                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            'hover:bg-muted/30 transition-colors',
                            hasReturns && 'border-l-4 border-l-amber-500 bg-amber-500/5'
                          )}
                        >
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                              >
                                {order.orderNumber}
                              </Link>
                              {hasReturns && <ReturnedBadge netValue={netValue} />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                                {order.dealer.businessName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-foreground truncate">{order.dealer.businessName}</p>
                                {order.dealer.ownerName && (
                                  <p className="text-[10px] text-muted-foreground font-medium truncate">{order.dealer.ownerName}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground/70" />
                              {formatDate(order.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <AmountBreakdown order={order} />
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              <span>View</span>
                              <ArrowUpRight className="size-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((order) => {
                const { hasReturns, netValue } = orderTotals(order);
                return (
                  <div
                    key={order.id}
                    className={cn(
                      'rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs',
                      hasReturns && 'border-l-4 border-l-amber-500 bg-amber-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20"
                        >
                          {order.orderNumber}
                        </Link>
                        {hasReturns && <ReturnedBadge netValue={netValue} />}
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                        {order.dealer.businessName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{order.dealer.businessName}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Amount</p>
                        <AmountBreakdown order={order} />
                      </div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Reset the order-number counter?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Realigns the next order number with what&apos;s actually in the table — one past the highest order
              number still on record, or #00001 if there are no orders left. Existing order numbers are never changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetCounter}
              disabled={resetCounter.isPending}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Reset Counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
