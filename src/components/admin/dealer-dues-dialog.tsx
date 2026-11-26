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
import { downloadDealerDuesPdf, splitDues, totalDue } from '@/lib/dealer-dues-pdf';
import { formatCurrency } from '@/lib/utils';

/** Asks for the overdue limit, then downloads the dealer dues PDF. */
export function DealerDuesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Download dues PDF" className="sm:max-w-md">
        <DealerDuesBody close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DealerDuesBody({ close }: { close: () => void }) {
  const [days, setDays] = useState('30');
  const [saving, setSaving] = useState(false);
  // Always fetched fresh: a report must not show payments from before the last change.
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['invoices', 'outstanding'],
    queryFn: api.invoices.outstanding,
    staleTime: 0,
    gcTime: 0,
  });

  const valid = /^\d{1,4}$/.test(days.trim());
  const preview = data && valid ? splitDues(data, Number(days)) : null;
  const empty = data?.length === 0;

  async function download() {
    if (!data || !valid || empty) return;
    setSaving(true);
    try {
      await downloadDealerDuesPdf(data, Number(days));
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
        <DialogTitle>Download dues PDF</DialogTitle>
        <DialogDescription>Overdue and pending payments of all dealers.</DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="overdue-days">Overdue after how many days?</Label>
        <Input
          id="overdue-days"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && download()}
          aria-invalid={!valid}
        />
        <p className={valid ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
          {valid ? 'Counted from the delivery date.' : 'Enter whole days, 0 or more.'}
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
        <p className="text-sm text-muted-foreground">No payments are due.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(['overdue', 'pending'] as const).map((key) => (
            <div key={key} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs capitalize text-muted-foreground">
                {key} {preview ? `(${preview[key].length})` : ''}
              </p>
              <p className="font-semibold tabular-nums">
                {preview ? formatCurrency(totalDue(preview[key])) : 'Loading'}
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
