'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency } from '@/lib/utils';

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading || !order) {
    return <Skeleton className="mx-auto h-72 w-full max-w-md" />;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="size-9 text-success" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Order Submitted — Pending Approval</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your order has been sent to Electro Mart for review. You&apos;ll be notified once it&apos;s approved.
        </p>
      </div>

      <div className="w-full rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Order Number</p>
        <p className="text-lg font-semibold">{order.orderNumber}</p>
        <p className="mt-2 text-sm text-muted-foreground">Total: {formatCurrency(order.totalAmount)}</p>
      </div>

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
