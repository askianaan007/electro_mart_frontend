import { Badge } from '@/components/ui/badge';
import type { PurchaseReturn, ReplacementStatus } from '@/lib/api/types';

const META: Record<ReplacementStatus, { label: string; variant: 'muted' | 'warning' | 'success' }> = {
  NOT_REPLACED: { label: 'Not replaced', variant: 'muted' },
  PARTIAL: { label: 'Partially replaced', variant: 'warning' },
  FULL: { label: 'Fully replaced', variant: 'success' },
};

export function ReplacementStatusBadge({ status }: { status: ReplacementStatus | undefined }) {
  const meta = META[status ?? 'NOT_REPLACED'];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/** "6 / 10" — units received back vs units returned, across all lines. */
export function replacementProgress(purchaseReturn: PurchaseReturn) {
  const returned = purchaseReturn.items.reduce((sum, item) => sum + item.quantity, 0);
  const received = purchaseReturn.items.reduce((sum, item) => sum + (item.receivedQuantity ?? 0), 0);
  return {
    returned,
    received,
    hasReceipts: received > 0,
    isFull: returned > 0 && received >= returned,
  };
}
