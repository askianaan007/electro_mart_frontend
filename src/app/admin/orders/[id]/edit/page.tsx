'use client';

import { useParams } from 'next/navigation';
import { OrderForm } from '@/components/admin/order-form';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
import { useOrder } from '@/hooks/use-orders';

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Edit order" backHref={`/admin/orders/${id}`} backLabel="Back to order" />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !order) {
    return <PageSkeleton cards={0} className="mx-auto max-w-5xl" />;
  }

  return <OrderForm order={order} />;
}
