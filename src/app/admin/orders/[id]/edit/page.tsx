'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderForm } from '@/components/admin/order-form';
import { useOrder } from '@/hooks/use-orders';

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full" />;
  }

  return <OrderForm order={order} />;
}
