'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { QueryErrorState } from '@/components/query-error-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { PageSkeleton } from '@/components/loading-state';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="-ml-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft />
      Back
    </Button>
  );

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load this order" />
        </Card>
      </div>
    );
  }

  if (isLoading || !order) {
    return <PageSkeleton cards={0} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {backButton}
        <PageHeader
          title={order.orderNumber}
          meta={<OrderStatusBadge status={order.status} />}
          description={`Placed on ${formatDate(order.createdAt)}`}
          actions={
            order.invoice && (
              <Button variant="outline" asChild>
                <Link href={`/dealer/invoices/${order.invoice.id}`}>
                  <Receipt />
                  View Invoice
                </Link>
              </Button>
            )
          }
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Order items"
          description={`${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`}
          className="pb-3"
        />
        <div className="border-t border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
          <dl className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCurrency(order.totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
