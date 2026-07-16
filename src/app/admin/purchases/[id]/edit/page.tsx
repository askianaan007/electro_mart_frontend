'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { PurchaseForm } from '@/components/admin/purchase-form';
import { usePurchase } from '@/hooks/use-purchases';

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const { data: purchase, isLoading } = usePurchase(id);

  if (isLoading || !purchase) {
    return <Skeleton className="h-96 w-full" />;
  }

  return <PurchaseForm purchase={purchase} />;
}
