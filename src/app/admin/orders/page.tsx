'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, RotateCcw, Search, ShoppingCart } from 'lucide-react';
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
  { value: 'all', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending' },
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
    return <span className={cn('font-medium', className)}>{formatCurrency(grossValue)}</span>;
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(grossValue)}</span>
      <span className="text-xs font-medium text-destructive">−{formatCurrency(returnedValue)} returned</span>
      <span className="font-semibold">{formatCurrency(netValue)} net</span>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Review and manage dealer orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RotateCcw />
            Reset Counter
          </Button>
          <Button asChild className="shrink-0">
            <Link href="/admin/orders/new">
              <Plus />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      >
        <TabsList className="flex-wrap">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="All orders" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[12rem]">
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
            value={dealerFilter}
            onValueChange={(v) => {
              setDealerFilter(v);
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

        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
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
            <EmptyState icon={ShoppingCart} title="No orders found" />
          )
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((order) => {
                    const { hasReturns, netValue } = orderTotals(order);
                    return (
                      <TableRow key={order.id} className={cn(hasReturns && 'border-l-4 border-l-warning bg-warning/5')}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary">
                              {order.orderNumber}
                            </Link>
                            {hasReturns && <ReturnedBadge netValue={netValue} />}
                          </div>
                        </TableCell>
                        <TableCell>{order.dealer.businessName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <AmountBreakdown order={order} />
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
              Realigns the next order number with what&apos;s actually in the table — one past the highest order
              number still on record, or #00001 if there are no orders left (e.g. after clearing a dealer&apos;s
              data). Existing order numbers are never changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetCounter} disabled={resetCounter.isPending}>
              Reset counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
