'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { useRegisterUnits } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import { newIdempotencyKey } from '@/lib/serial';

type Props = {
  productId: string;
  productName: string;
  purchaseId?: string;
  purchaseLabel?: string;
  /** Units still without a serial. */
  max?: number;
};

/**
 * Attach serials to units that are already in stock — either the goods of a
 * purchase ("scan later") or stock that was on the shelf before tracking
 * started. Never changes stock: the server refuses more serials than units.
 */
export function RegisterSerialsDialog({
  open,
  onOpenChange,
  ...props
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add serials" className="sm:max-w-lg">
        {/* Content unmounts while closed, so every opening starts empty with a new request key. */}
        <RegisterSerialsBody {...props} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RegisterSerialsBody({
  productId,
  productName,
  purchaseId,
  purchaseLabel,
  max,
  close,
}: Props & { close: () => void }) {
  const [serials, setSerials] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [scan, setScan] = useState<SerialScanState>({ ok: true, pending: false, problems: [] });
  // One key per opening: a double-click or retry replays instead of registering twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const register = useRegisterUnits();

  function save() {
    register.mutate(
      {
        productId,
        serials,
        purchaseId,
        notes: purchaseId ? undefined : notes.trim() || undefined,
        idempotencyKey,
      },
      {
        onSuccess: (result) => {
          toast.success(`${result.registered} serial(s) registered`);
          close();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          // A refused request did nothing; let the next attempt be a new request.
          setIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add serial numbers</DialogTitle>
        <DialogDescription>
          {productName}
          {purchaseLabel ? ` · ${purchaseLabel}` : ' · stock already on the shelf'}
          {max !== undefined && ` · ${max} unit(s) still without a serial`}
        </DialogDescription>
      </DialogHeader>

      <SerialScanInput
        productId={productId}
        context="RECEIVE"
        purchaseId={purchaseId}
        value={serials}
        onChange={setSerials}
        max={max}
        autoFocus
        onStateChange={setScan}
      />

      {!purchaseId && (
        <div className="space-y-1.5">
          <Label htmlFor="register-notes">Note (optional)</Label>
          <Input
            id="register-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Counted on shelf during stock take"
          />
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={save}
          loading={register.isPending}
          disabled={serials.length === 0 || !scan.ok || scan.pending}
        >
          Register {serials.length || ''} serial(s)
        </Button>
      </DialogFooter>
    </>
  );
}
