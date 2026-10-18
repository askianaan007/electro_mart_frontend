'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { PaginationBar } from '@/components/pagination-bar';
import { QueryErrorState } from '@/components/query-error-state';
import { OrderStatusBadge } from '@/components/status-badge';
import { useOrders } from '@/hooks/use-orders';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/lib/api/types';

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function DealerOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const { data, isLoading, isFetching, isError, error, refetch } = useOrders({
    page,
    limit: 20,
    status: status === 'all' ? undefined : (status as OrderStatus),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders"
        description="Track the status of every order you've placed."
        actions={
          <Button asChild>
            <Link href="/dealer/products">
              <ShoppingBag />
              New Order
            </Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Orders" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <Tabs
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </FilterBar>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No orders found"
            description={status === 'all' ? 'Orders you place will appear here.' : 'No orders match this status.'}
          />
        ) : (
          <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/dealer/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.orderNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground sm:hidden">{formatDate(order.createdAt)}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
