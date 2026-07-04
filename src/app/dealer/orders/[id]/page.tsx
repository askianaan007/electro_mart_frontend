'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
        </div>
        {order.invoice && (
          <Button variant="outline" asChild>
            <Link href={`/dealer/invoices/${order.invoice.id}`}>
              <Receipt />
              View Invoice
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Card className="w-full sm:w-72">
          <CardContent className="space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
