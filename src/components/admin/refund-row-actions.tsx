'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Ban, Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
import { ChequeStatusBadge } from '@/components/status-badge';
import { RowActionsMenu, StatusMenuBadge, type StatusOption } from '@/components/row-actions';
import { RefundFormDialog } from '@/components/admin/refund-form-dialog';
import { RefundCancelDialog } from '@/components/admin/refund-cancel-dialog';
import { useRestoreRefund, useUpdateRefundChequeStatus } from '@/hooks/use-refunds';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { ChequeStatus, Refund } from '@/lib/api/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<ChequeStatus, string> = {
  PENDING: 'Pending',
  CLEARED: 'Mark cleared',
  RETURNED: 'Mark returned (bounced)',
};

/**
 * Mirrors the backend's cheque-transitions.ts: a supplier's refund cheque
 * (money in) can move freely — bank reversals, re-presented cheques; a
 * refund cheque we paid a customer moves forward, or back to pending within
 * a day of its last change.
 */
function allowedStatuses(refund: Refund): ChequeStatus[] {
  const from = refund.chequeStatus;
  if (refund.mode !== 'CHEQUE' || !from || refund.cancelledAt) return [];
  if (refund.party === 'SUPPLIER') {
    return (['PENDING', 'CLEARED', 'RETURNED'] as const).filter((s) => s !== from);
  }
  if (from === 'PENDING') return ['CLEARED', 'RETURNED'];
  const changedAt = refund.chequeStatusUpdatedAt ? new Date(refund.chequeStatusUpdatedAt).getTime() : 0;
  return Date.now() - changedAt <= DAY_MS ? ['PENDING'] : [];
}

/** What a cheque status change does to the party's balance and to Liquid Cash, in plain words. */
function consequence(refund: Refund, to: ChequeStatus) {
  const amount = formatCurrency(refund.amount);
  const incoming = refund.party === 'SUPPLIER';
  const from = refund.chequeStatus;
  if (to === 'CLEARED') {
    return incoming
      ? `The money is in the bank: ${amount} is added to Liquid Cash, dated today.`
      : `The cheque has been cashed: ${amount} leaves Liquid Cash, dated today.`;
  }
  if (to === 'RETURNED') {
    return (
      (incoming
        ? `The cheque bounced: the supplier owes you ${amount} again.`
        : `The cheque bounced: the customer's ${amount} credit comes back.`) +
      (from === 'CLEARED' ? ' Liquid Cash is corrected by the same amount, dated today.' : '')
    );
  }
  return from === 'RETURNED'
    ? `The cheque is being re-presented: it counts against the ${incoming ? 'supplier' : 'customer'} balance again and reaches Liquid Cash only once cleared.`
    : `Back to awaiting clearance: ${amount} is taken out of Liquid Cash until the cheque is marked cleared again.`;
}

function restoreConsequence(refund: Refund) {
  const amount = formatCurrency(refund.amount);
  if (refund.mode === 'CHEQUE' && refund.chequeStatus === 'RETURNED') {
    return 'It comes back as a bounced cheque — nothing changes until it is re-presented.';
  }
  if (refund.mode === 'CHEQUE' && refund.chequeStatus === 'PENDING') {
    return `It counts again: ${amount} comes off the balance, and reaches Liquid Cash once the cheque clears.`;
  }
  return `It counts again: ${amount} comes off the balance and goes back into Liquid Cash, dated today.`;
}

type Confirm = { refund: Refund; kind: 'status'; status: ChequeStatus } | { refund: Refund; kind: 'restore' };

/**
 * Everything a refund row can do — change its cheque status, edit, cancel,
 * restore — with the confirmations and dialogs those need. Render
 * `dialogs` once on the page; use `statusControl` and `menu` per row.
 */
export function useRefundRowActions() {
  const [editing, setEditing] = useState<Refund | null>(null);
  const [cancelling, setCancelling] = useState<Refund | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const updateChequeStatus = useUpdateRefundChequeStatus();
  const restoreRefund = useRestoreRefund();

  function busy(refund: Refund) {
    return (
      (updateChequeStatus.isPending && updateChequeStatus.variables?.id === refund.id) ||
      (restoreRefund.isPending && restoreRefund.variables === refund.id)
    );
  }

  function statusControl(refund: Refund) {
    if (refund.mode !== 'CHEQUE' || !refund.chequeStatus) return null;
    const badge = <ChequeStatusBadge status={refund.chequeStatus} />;
    const allowed = allowedStatuses(refund);
    if (allowed.length === 0) return badge;
    const options: StatusOption[] = [
      { label: STATUS_LABEL[refund.chequeStatus], current: true, onSelect: () => undefined },
      ...allowed.map((status) => ({
        label: status === 'PENDING' ? 'Back to pending' : STATUS_LABEL[status],
        destructive: status === 'RETURNED',
        onSelect: () => setConfirm({ refund, kind: 'status', status }),
      })),
    ];
    return <StatusMenuBadge label="Change cheque status" busy={busy(refund)} badge={badge} options={options} />;
  }

  function cancelledBadge(refund: Refund) {
    if (!refund.cancelledAt) return null;
    return (
      <Badge variant="muted" title={refund.cancelReason ?? undefined}>
        <Ban className="size-3" />
        Cancelled
      </Badge>
    );
  }

  function menu(refund: Refund) {
    const cancelled = !!refund.cancelledAt;
    return (
      <RowActionsMenu
        label="Refund actions"
        disabled={busy(refund)}
        groups={[
          [
            { label: 'Edit refund', icon: Pencil, hidden: cancelled, onSelect: () => setEditing(refund) },
            {
              label: 'Restore refund',
              icon: Undo2,
              hidden: !cancelled,
              onSelect: () => setConfirm({ refund, kind: 'restore' }),
            },
          ],
          [
            {
              label: 'Cancel refund',
              icon: RotateCcw,
              destructive: true,
              hidden: cancelled,
              onSelect: () => setCancelling(refund),
            },
          ],
        ]}
      />
    );
  }

  function runConfirm() {
    if (!confirm) return;
    const { refund } = confirm;
    if (confirm.kind === 'restore') {
      restoreRefund.mutate(refund.id, {
        onSuccess: () => toast.success(`Refund ${refund.refundNumber} restored`),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      const { status } = confirm;
      updateChequeStatus.mutate(
        { id: refund.id, status },
        {
          onSuccess: () =>
            toast.success(
              status === 'CLEARED'
                ? 'Cheque cleared — now counted in Liquid Cash'
                : status === 'RETURNED'
                  ? 'Cheque marked returned — balance restored'
                  : 'Cheque back to pending',
            ),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    }
    setConfirm(null);
  }

  const dialogs = (
    <>
      <RefundFormDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} refund={editing} />
      <RefundCancelDialog refund={cancelling} onClose={() => setCancelling(null)} />
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'restore'
                ? `Restore refund ${confirm.refund.refundNumber}?`
                : confirm
                  ? `${confirm.status === 'PENDING' ? 'Move' : 'Mark'} cheque ${confirm.refund.chequeNumber ?? ''} ${
                      confirm.status === 'PENDING' ? 'back to pending' : confirm.status.toLowerCase()
                    }?`
                  : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'restore'
                ? restoreConsequence(confirm.refund)
                : confirm
                  ? consequence(confirm.refund, confirm.status)
                  : ''}{' '}
              You can change this again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={
                confirm?.kind === 'status' && confirm.status === 'RETURNED'
                  ? buttonVariants({ variant: 'destructive' })
                  : undefined
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { statusControl, cancelledBadge, menu, dialogs };
}
