'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency } from '@/lib/utils';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  if (isError) {
    return (
      <Card className="mx-auto max-w-md">
        <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load your order" />
      </Card>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10" aria-busy="true" aria-label="Loading">
        <Skeleton className="size-14 rounded-full" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-success/20 bg-success/10">
        <CheckCircle2 className="size-7 text-success" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Order Submitted — Pending Approval</h1>
        <p className="text-sm text-muted-foreground">
          Your order has been sent to Electro Mart for review. You&apos;ll be notified once it&apos;s approved.
        </p>
      </div>

      <Card className="w-full text-left">
        <dl className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between gap-3 p-4">
            <dt className="text-muted-foreground">Order Number</dt>
            <dd className="font-semibold text-foreground">{order.orderNumber}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-semibold tabular-nums text-foreground">{formatCurrency(order.totalAmount)}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/dealer/dashboard">Back to Dashboard</Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href={`/dealer/orders/${order.id}`}>View Order</Link>
        </Button>
      </div>
    </div>
  );
}
