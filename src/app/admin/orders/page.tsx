'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Clock, Plus, RotateCcw, Search, ShoppingCart, Truck, X } from 'lucide-react';
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
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
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
    <Badge variant={netValue <= 0 ? 'destructive' : 'warning'}>
      {netValue <= 0 ? 'Fully Returned' : 'Partially Returned'}
    </Badge>
  );
}

function AmountBreakdown({ order, className }: { order: Order; className?: string }) {
  const { grossValue, returnedValue, netValue, hasReturns } = orderTotals(order);

  if (!hasReturns) {
    return (
      <span className={cn('font-medium tabular-nums text-foreground', className)}>{formatCurrency(grossValue)}</span>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5 tabular-nums', className)}>
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(grossValue)}</span>
      <span className="text-xs font-medium text-destructive">−{formatCurrency(returnedValue)} returned</span>
      <span className="font-medium text-foreground">{formatCurrency(netValue)} net</span>
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
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Review dealer orders, approve incoming requests, track delivery status and handle returns."
        actions={
          <>
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              <RotateCcw />
              Reset Counter
            </Button>
            <Button asChild>
              <Link href="/admin/orders/new">
                <Plus />
                New Order
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] w-full rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Orders" value={totalOrdersCount} icon={ShoppingCart} />
            <StatCard label="Pending Approval" value={pendingCount} icon={Clock} tone="warning" hint="On this page" />
            <StatCard
              label="In Packing / Shipping"
              value={inProgressCount}
              icon={Truck}
              tone="purple"
              hint="On this page"
            />
            <StatCard
              label="Delivered & Completed"
              value={completedCount}
              icon={CheckCircle2}
              tone="success"
              hint="On this page"
            />
          </>
        )}
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <TabsList className="max-w-full justify-start overflow-x-auto scrollbar-thin">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Orders register" isFetching={isFetching && !isLoading} className="pb-3" />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, dealer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            value={dealerFilter}
            onValueChange={(v) => {
              setDealerFilter(v);
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

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
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
              className="min-w-0 w-full sm:w-auto"
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
              title="No matching orders"
              description="Try adjusting or clearing your search term and date range filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No orders recorded"
              description="Dealer orders submitted to the system will display here"
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer / Dealer</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((order) => {
                    const { hasReturns, netValue } = orderTotals(order);
                    return (
                      <TableRow key={order.id} className={cn(hasReturns && 'bg-warning/5')}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                            {hasReturns && <ReturnedBadge netValue={netValue} />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{order.dealer.businessName}</p>
                            {order.dealer.ownerName && (
                              <div className="truncate text-xs text-muted-foreground">{order.dealer.ownerName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <AmountBreakdown order={order} className="items-end" />
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/orders/${order.id}`}>
                              View
                              <ArrowUpRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((order) => {
                const { hasReturns, netValue } = orderTotals(order);
                return (
                  <div
                    key={order.id}
                    className={cn(
                      'space-y-3 rounded-lg border border-border bg-card p-4',
                      hasReturns && 'border-warning/25 bg-warning/5',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                        {hasReturns && <ReturnedBadge netValue={netValue} />}
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{order.dealer.businessName}</p>
                      <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                    </div>

                    <div className="flex items-end justify-between border-t border-border pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total amount</p>
                        <AmountBreakdown order={order} />
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/orders/${order.id}`}>
                          Details
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the order-number counter?</AlertDialogTitle>
            <AlertDialogDescription>
              Realigns the next order number with what&apos;s actually in the table — one past the highest order number
              still on record, or #00001 if there are no orders left. Existing order numbers are never changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetCounter} disabled={resetCounter.isPending}>
              Reset Counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
