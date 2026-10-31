'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, Link2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateChequeStatus as useUpdateSettlementChequeStatus } from '@/hooks/use-credits';
import { useUpdatePaymentChequeStatus } from '@/hooks/use-payments';
import { useUpdateRefundChequeStatus } from '@/hooks/use-refunds';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error';
import { ERP_CHEQUE_STATUS, SIDE_META, STATUS_META, dueLabel, formatDay } from '@/lib/cheque-flow';
import { formatCurrency } from '@/lib/utils';
import type { ChequeFlowEntry, ChequeFlowStatus } from '@/lib/api/types';

type LinkedStatus = Exclude<ChequeFlowStatus, 'CANCELLED'>;

/** What the change does to the books — the same thing the source page does. */
function effect(entry: ChequeFlowEntry, status: LinkedStatus): string {
  const incoming = entry.direction === 'RECEIVABLE';
  if (status === 'CLEARED') {
    return incoming ? 'The money counts in Liquid Cash from today.' : 'The money leaves Liquid Cash from today.';
  }
  if (status === 'BOUNCED') {
    if (entry.source === 'PAYMENT') {
      return "The payment is reversed: the invoice and the customer's balance go back up.";
    }
    if (entry.source === 'SETTLEMENT') return "The supplier's credit balance goes back up.";
    return 'The refund is treated as not paid.';
  }
  return entry.status === 'BOUNCED'
    ? 'The cheque is re-presented and counts as paid again, waiting to clear.'
    : 'The cheque goes back to waiting for the bank.';
}

/**
 * Changes the status of a cheque recorded in Payments, Credits or Refunds,
 * through the same endpoint and rules that page uses — balances, wallet and
 * Liquid Cash come out exactly as if it had been done there.
 */
export function LinkedStatusDialog({
  target,
  onClose,
}: {
  /** `status` null = let the user pick from the allowed moves. */
  target: { entry: ChequeFlowEntry; status: ChequeFlowStatus | null } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Update linked cheque" className="sm:max-w-md">
        {target && (
          <LinkedStatusForm key={target.entry.id} entry={target.entry} preset={target.status} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinkedStatusForm({
  entry,
  preset,
  onClose,
}: {
  entry: ChequeFlowEntry;
  preset: ChequeFlowStatus | null;
  onClose: () => void;
}) {
  const payment = useUpdatePaymentChequeStatus();
  const settlement = useUpdateSettlementChequeStatus();
  const refund = useUpdateRefundChequeStatus();
  const pending = payment.isPending || settlement.isPending || refund.isPending;
  // Set when Payments refuses a re-presented cheque that would now overpay the invoice.
  const [excess, setExcess] = useState<{ status: LinkedStatus; message: string } | null>(null);

  const choices = (['CLEARED', 'PENDING', 'BOUNCED'] as const).filter(
    (s) => entry.allowedStatuses.includes(s) && (!preset || preset === s),
  );

  function apply(status: LinkedStatus, excessToWallet = false) {
    const erp = ERP_CHEQUE_STATUS[status];
    const done = () => {
      toast.success(`Cheque ${entry.chequeNumber ?? ''} marked ${STATUS_META[status].label.toLowerCase()}`);
      onClose();
    };
    const failed = (error: unknown) => {
      if (
        entry.source === 'PAYMENT' &&
        !excessToWallet &&
        error instanceof ApiError &&
        error.errorName === 'EXCEEDS_INVOICE_BALANCE'
      ) {
        setExcess({ status, message: error.message });
        return;
      }
      toast.error(getErrorMessage(error));
    };
    const handlers = { onSuccess: done, onError: failed };
    if (entry.source === 'PAYMENT') {
      payment.mutate({ id: entry.sourceId, status: erp, excessToWallet: excessToWallet || undefined }, handlers);
    } else if (entry.source === 'SETTLEMENT') {
      settlement.mutate({ paymentId: entry.sourceId, status: erp }, handlers);
    } else if (entry.source === 'REFUND') {
      refund.mutate({ id: entry.sourceId, status: erp }, handlers);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" />
          {entry.kindLabel ?? `${SIDE_META[entry.direction].short} cheque`} · from {entry.sourceLabel}
        </DialogTitle>
        <DialogDescription>
          {entry.partyName} — cheque {entry.chequeNumber ?? '(no number)'}
          {entry.bankName ? `, ${entry.bankName}` : ''}, {formatCurrency(entry.amount)} dated{' '}
          {formatDay(entry.chequeDate)}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_META[entry.status].variant}>{STATUS_META[entry.status].label}</Badge>
          {dueLabel(entry) && <span className="text-xs text-muted-foreground">{dueLabel(entry)}</span>}
          {entry.invoiceRef && <span className="text-xs text-muted-foreground">{entry.invoiceRef}</span>}
        </div>

        {excess ? (
          <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="font-medium">This cheque would now overpay the invoice</p>
            <p className="text-xs text-muted-foreground">{excess.message}</p>
            <p className="text-xs text-muted-foreground">
              Record it anyway and put the extra in the customer&apos;s wallet, to use on their next invoice — the same
              choice the Payments page offers.
            </p>
          </div>
        ) : choices.length === 0 ? (
          <p className="text-muted-foreground">
            No status change is allowed for this cheque right now. Open it in {entry.sourceLabel} to see why.
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {choices.map((s) => (
              <li key={s}>
                <span className="font-medium text-foreground">{STATUS_META[s].label}:</span> {effect(entry, s)}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">
          Same as doing it on the {entry.sourceLabel} page — it updates there too.
        </p>
      </div>

      <DialogFooter className="flex-wrap gap-2">
        {entry.link && (
          <Button variant="outline" asChild className="sm:mr-auto">
            <Link href={entry.link}>
              <ExternalLink /> Open in {entry.sourceLabel}
            </Link>
          </Button>
        )}
        {excess ? (
          <>
            <Button variant="outline" onClick={() => setExcess(null)} disabled={pending}>
              Back
            </Button>
            <Button onClick={() => apply(excess.status, true)} loading={pending}>
              <Wallet /> Record &amp; add to wallet
            </Button>
          </>
        ) : (
          choices.map((s) => (
            <Button
              key={s}
              variant={s === 'BOUNCED' ? 'destructive' : s === 'CLEARED' ? 'success' : 'outline'}
              onClick={() => apply(s)}
              loading={pending}
            >
              {s === 'CLEARED' ? 'Mark cleared' : s === 'BOUNCED' ? 'Mark bounced' : 'Back to pending'}
            </Button>
          ))
        )}
      </DialogFooter>
    </>
  );
}
