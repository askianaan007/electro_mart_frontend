'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useLinkPurchaseReturn, usePurchaseReturns } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Purchase, PurchaseReturn } from '@/lib/api/types';

/**
 * Standalone returns to this order's supplier whose every item fits what's
 * still returnable on this order — likely recorded from the supplier's page
 * for goods that came on this invoice. Linking moves no money or stock; it
 * makes the order count them, so the same units can't be returned twice.
 */
export function UnlinkedReturnsNotice({ purchase, returns }: { purchase: Purchase; returns: PurchaseReturn[] }) {
  const [linking, setLinking] = useState<PurchaseReturn | null>(null);
  const linkReturn = useLinkPurchaseReturn();
  const { data } = usePurchaseReturns({ supplierId: purchase.supplierId, linked: false, limit: 50 });

  const remaining = new Map<string, number>();
  for (const item of purchase.items) {
    remaining.set(item.productId, (remaining.get(item.productId) ?? 0) + item.quantity);
  }
  for (const r of returns) {
    for (const item of r.items) remaining.set(item.productId, (remaining.get(item.productId) ?? 0) - item.quantity);
  }
  const candidates = (data?.data ?? []).filter((r) =>
    r.items.every((item) => (remaining.get(item.productId) ?? 0) >= item.quantity),
  );

  if (purchase.cancelledAt || candidates.length === 0) return null;

  function confirmLink() {
    if (!linking) return;
    const { returnNumber } = linking;
    linkReturn.mutate(
      { id: linking.id, purchaseId: purchase.id },
      {
        onSuccess: () => toast.success(`${returnNumber} linked to order #${purchase.invoiceNumber}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setLinking(null);
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
      <p className="text-sm font-semibold">
        {purchase.supplier.name} has {candidates.length === 1 ? 'a return' : `${candidates.length} returns`} not tied
        to any order
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        If these goods came on this order, link the return here. Nothing changes in stock or money — this order just
        starts counting it, so the same units can&apos;t be returned twice.
      </p>
      <ul className="mt-3 space-y-2">
        {candidates.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <span className="font-medium">{r.returnNumber}</span>
              <span className="text-muted-foreground">
                {' '}
                &middot; {formatDate(r.returnDate)} &middot; {r.reason}
              </span>
              <div className="break-words text-xs text-muted-foreground">
                {r.items.map((item) => `${item.quantity} × ${item.product?.name ?? item.productId}`).join(', ')}{' '}
                &middot; {formatCurrency(r.totalAmount)}
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setLinking(r)}>
              <Link2 />
              Link to this order
            </Button>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!linking} onOpenChange={(open) => !open && setLinking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Link {linking?.returnNumber} to order #{purchase.invoiceNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Its {linking ? formatCurrency(linking.totalAmount) : ''} return will show on this order and count
              against what can still be returned. Stock, the supplier balance and Liquid Cash don&apos;t change. You
              can unlink it again from the returns list below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLink}>Link return</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
