'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { downloadDealerDuesPdf, filterDues, totalDue } from '@/lib/dealer-dues-pdf';
import { formatCurrency } from '@/lib/utils';

/** Asks for the minimum outstanding amount, then downloads the dealer dues PDF. */
export function DealerDuesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Download outstanding PDF" className="sm:max-w-md">
        <DealerDuesBody close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DealerDuesBody({ close }: { close: () => void }) {
  const [minAmount, setMinAmount] = useState('0');
  const [saving, setSaving] = useState(false);
  // Always fetched fresh: a report must not show payments from before the last change.
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['invoices', 'outstanding'],
    queryFn: api.invoices.outstanding,
    staleTime: 0,
    gcTime: 0,
  });

  const valid = /^\d{1,10}(\.\d{1,2})?$/.test(minAmount.trim());
  const preview = data && valid ? filterDues(data, Number(minAmount)) : null;
  const empty = preview?.dealerCount === 0;

  async function download() {
    if (!data || !preview || empty || isFetching) return;
    setSaving(true);
    try {
      await downloadDealerDuesPdf(data, Number(minAmount));
      close();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Download outstanding PDF</DialogTitle>
        <DialogDescription>Invoices still to be collected.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="min-amount">Minimum outstanding amount</Label>
        <Input
          id="min-amount"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && download()}
          aria-invalid={!valid}
        />
        <p className={valid ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
          {valid ? 'Dealers owing less are left out.' : 'Enter 0 or more, up to 2 decimals.'}
        </p>
      </div>

      {isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : empty ? (
        <p className="text-sm text-muted-foreground">No dealer owes this much.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['pending', 'Pending'],
              ['partial', 'Partly paid'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {label} {preview ? `(${preview[key].length} invoices)` : ''}
              </p>
              <p className="font-semibold tabular-nums">
                {preview ? formatCurrency(totalDue(preview[key])) : valid ? 'Loading' : 'N/A'}
              </p>
            </div>
          ))}
        </div>
      )}

      <DialogFooter className="flex-row">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1 sm:flex-none"
          onClick={download}
          loading={saving || isFetching}
          disabled={!preview || empty || isFetching || isError}
        >
          <Download />
          Download
        </Button>
      </DialogFooter>
    </>
  );
}
