'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PurchaseForm } from '@/components/admin/purchase-form';
import { usePurchase } from '@/hooks/use-purchases';

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { data: purchase, isLoading, isError, error, refetch } = usePurchase(id);

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit purchase" backHref={`/admin/purchases/${id}`} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load this purchase" />
        </div>
      </div>
    );
  }

  if (isLoading || !purchase) {
    return <PageSkeleton cards={0} />;
  }

  return <PurchaseForm purchase={purchase} />;
}
