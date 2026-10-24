'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUseWalletCredit } from '@/hooks/use-dealer-wallet';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  dealerName: string;
  /** Still owed on the invoice. */
  due: number;
  /** Spendable wallet credit. */
  available: number;
  /** Wallet credit waiting for a cheque to clear. */
  pending: number;
};

/** Pays part or all of an invoice from the dealer's wallet. */
export function UseWalletCreditDialog({
  open,
  onOpenChange,
  ...props
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Use wallet credit" className="sm:max-w-md">
        {/* Remounts on every open, so the amount starts from the current figures. */}
        <UseWalletCreditBody {...props} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UseWalletCreditBody({
  invoiceId,
  invoiceNumber,
  dealerName,
  due,
  available,
  pending,
  close,
}: Props & { close: () => void }) {
  const max = Math.min(due, available);
  const [amount, setAmount] = useState(max > 0 ? String(max) : '');
  const useCredit = useUseWalletCredit();
  const value = Number(amount) || 0;
  const error =
    !amount || value <= 0
      ? 'Enter an amount'
      : !/^\d+(\.\d{1,2})?$/.test(amount.trim())
        ? 'Up to 2 decimals'
        : value > available
          ? `Only ${formatCurrency(available)} available`
          : value > due
            ? `Only ${formatCurrency(due)} is due`
            : null;

  function save() {
    if (error) return;
    useCredit.mutate(
      { invoiceId, amount: value },
      {
        onSuccess: () => {
          toast.success(`${formatCurrency(value)} paid from the wallet`);
          close();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Use wallet credit</DialogTitle>
        <DialogDescription>
          {dealerName} · {invoiceNumber}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">In wallet</p>
          <p className="font-semibold tabular-nums text-success">{formatCurrency(available)}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">Due on invoice</p>
          <p className="font-semibold tabular-nums">{formatCurrency(due)}</p>
        </div>
      </div>
      {pending > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatCurrency(pending)} more becomes usable when the cheque that paid it clears.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="wallet-amount">Amount to use</Label>
        <Input
          id="wallet-amount"
          type="number"
          inputMode="decimal"
          min={0.01}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          aria-invalid={!!amount && !!error}
        />
        {amount && error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {value > 0 && value < due
              ? `${formatCurrency(due - value)} will still be due.`
              : 'The invoice will be fully paid.'}
          </p>
        )}
      </div>

      <DialogFooter className="flex-row">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1 sm:flex-none"
          onClick={save}
          loading={useCredit.isPending}
          disabled={!!error}
        >
          Use {value > 0 ? formatCurrency(value) : ''}
        </Button>
      </DialogFooter>
    </>
  );
}
