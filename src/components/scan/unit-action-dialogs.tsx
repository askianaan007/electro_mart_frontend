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
import { Textarea } from '@/components/ui/textarea';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { useSetUnitCondition, useSupplierReplacement, useUpdateUnit, useWarrantySwap } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import type { UnitDetail } from '@/lib/api/types';
import { newIdempotencyKey } from '@/lib/serial';

type Unit = UnitDetail['unit'];
type DialogProps = { unit: Unit; open: boolean; onOpenChange: (open: boolean) => void };
type BodyProps = { unit: Unit; close: () => void };

const IDLE: SerialScanState = { ok: true, pending: false, problems: [] };

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

/**
 * Dialog content unmounts while closed, so each body below starts from fresh
 * state every time the dialog opens — no reset effects needed.
 */
function Frame({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Footer({
  close,
  onSubmit,
  submitLabel,
  pending,
  disabled,
  destructive,
}: {
  close: () => void;
  onSubmit: () => void;
  submitLabel: string;
  pending: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={close}>
        Cancel
      </Button>
      <Button
        type="button"
        variant={destructive ? 'destructive' : 'default'}
        onClick={onSubmit}
        loading={pending}
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </DialogFooter>
  );
}

// ---------------------------------------------------------------------------

export function CorrectSerialDialog({ unit, open, onOpenChange }: DialogProps) {
  return (
    <Frame
      open={open}
      onOpenChange={onOpenChange}
      title="Correct serial number"
      description="Only for a typo on a unit that never went on an order. The old value stays in the history."
    >
      <CorrectSerialBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function CorrectSerialBody({ unit, close }: BodyProps) {
  const [serial, setSerial] = useState(unit.serialNumber);
  const [reason, setReason] = useState('');
  const update = useUpdateUnit(unit.id);
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="correct-serial">Serial number</Label>
          <Input id="correct-serial" value={serial} onChange={(e) => setSerial(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="correct-reason">Reason</Label>
          <Input
            id="correct-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Typed 0 instead of O"
            maxLength={500}
          />
        </div>
      </div>
      <Footer
        close={close}
        submitLabel="Save correction"
        pending={update.isPending}
        disabled={!serial.trim() || serial.trim() === unit.serialNumber || !reason.trim()}
        onSubmit={() =>
          update.mutate(
            { serialNumber: serial.trim(), reason: reason.trim() },
            {
              onSuccess: () => {
                toast.success('Serial corrected');
                close();
              },
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function WarrantyDialog({ unit, open, onOpenChange }: DialogProps) {
  return (
    <Frame
      open={open}
      onOpenChange={onOpenChange}
      title="Edit warranty"
      description="Manual dates are kept from now on — later delivery-date changes won't overwrite them."
    >
      <WarrantyBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function WarrantyBody({ unit, close }: BodyProps) {
  const [startsAt, setStartsAt] = useState(dateInput(unit.warrantyStartsAt));
  const [expiresAt, setExpiresAt] = useState(dateInput(unit.warrantyExpiresAt));
  const [reason, setReason] = useState('');
  const update = useUpdateUnit(unit.id);
  const invalid = !!startsAt && !!expiresAt && expiresAt < startsAt;
  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="warranty-start">Starts</Label>
            <Input id="warranty-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warranty-end">Expires</Label>
            <Input id="warranty-end" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        {invalid && <p className="text-xs text-destructive">Expiry is before the start date</p>}
        <div className="space-y-1.5">
          <Label htmlFor="warranty-reason">Reason</Label>
          <Input
            id="warranty-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Extended warranty agreed with customer"
            maxLength={500}
          />
        </div>
      </div>
      <Footer
        close={close}
        submitLabel="Save warranty"
        pending={update.isPending}
        disabled={!reason.trim() || invalid}
        onSubmit={() =>
          update.mutate(
            {
              warrantyStartsAt: startsAt ? new Date(startsAt).toISOString() : null,
              warrantyExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
              reason: reason.trim(),
            },
            {
              onSuccess: () => {
                toast.success('Warranty updated');
                close();
              },
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function NotesDialog({ unit, open, onOpenChange }: DialogProps) {
  return (
    <Frame open={open} onOpenChange={onOpenChange} title="Unit notes">
      <NotesBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function NotesBody({ unit, close }: BodyProps) {
  const [notes, setNotes] = useState(unit.notes ?? '');
  const update = useUpdateUnit(unit.id);
  return (
    <>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={4} />
      <Footer
        close={close}
        submitLabel="Save notes"
        pending={update.isPending}
        onSubmit={() =>
          update.mutate(
            { notes: notes.trim() || null },
            {
              onSuccess: () => {
                toast.success('Notes saved');
                close();
              },
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function ConditionDialog({ unit, open, onOpenChange }: DialogProps) {
  const target = unit.condition === 'GOOD' ? 'DEFECTIVE' : 'GOOD';
  return (
    <Frame
      open={open}
      onOpenChange={onOpenChange}
      title={target === 'DEFECTIVE' ? 'Mark as defective' : 'Mark as good'}
      description={
        target === 'DEFECTIVE'
          ? 'A defective unit can’t be put on an order until it is marked good again.'
          : 'Use this once the unit has been checked or repaired and can be sold.'
      }
    >
      <ConditionBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function ConditionBody({ unit, close }: BodyProps) {
  const target = unit.condition === 'GOOD' ? 'DEFECTIVE' : 'GOOD';
  const [reason, setReason] = useState('');
  const setCondition = useSetUnitCondition(unit.id);
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="condition-reason">{target === 'DEFECTIVE' ? 'What is wrong?' : 'Reason'}</Label>
        <Input
          id="condition-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={target === 'DEFECTIVE' ? 'e.g. Screen cracked in warehouse' : 'e.g. Repaired by service centre'}
          maxLength={500}
        />
      </div>
      <Footer
        close={close}
        submitLabel={target === 'DEFECTIVE' ? 'Mark defective' : 'Mark good'}
        pending={setCondition.isPending}
        disabled={!reason.trim()}
        destructive={target === 'DEFECTIVE'}
        onSubmit={() =>
          setCondition.mutate(
            { condition: target, reason: reason.trim() },
            {
              onSuccess: () => {
                toast.success(target === 'DEFECTIVE' ? 'Marked defective' : 'Marked good');
                close();
              },
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

// The replacement must already be a registered, in-stock, good unit.
const SWAP_REJECT = {
  NEW_WILL_REGISTER: 'Not registered — register it first (purchase or serial units page)',
} as const;

export function WarrantySwapDialog({ unit, open, onOpenChange }: DialogProps) {
  return (
    <Frame
      open={open}
      onOpenChange={onOpenChange}
      title="Warranty swap"
      description={`Give the customer another ${unit.product.name} in place of ${unit.serialNumber}. No stock or money changes — this unit comes back as defective and the new one takes its place on the order, keeping the same warranty dates.`}
    >
      <WarrantySwapBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function WarrantySwapBody({ unit, close }: BodyProps) {
  const [serials, setSerials] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [faultNote, setFaultNote] = useState('');
  const [scan, setScan] = useState<SerialScanState>(IDLE);
  // One key per opening: a retry after a lost response replays instead of swapping twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const swap = useWarrantySwap(unit.id);
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Replacement unit (in stock, good)</Label>
          <SerialScanInput
            productId={unit.productId}
            context="ASSIGN"
            value={serials}
            onChange={setSerials}
            max={1}
            autoFocus
            reject={SWAP_REJECT}
            onStateChange={setScan}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="swap-reason">Reason</Label>
          <Input
            id="swap-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Dead pixels within warranty"
            maxLength={500}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="swap-fault">Fault on {unit.serialNumber} (optional)</Label>
          <Input
            id="swap-fault"
            value={faultNote}
            onChange={(e) => setFaultNote(e.target.value)}
            placeholder="e.g. Vertical line on left side"
            maxLength={500}
          />
        </div>
      </div>
      <Footer
        close={close}
        submitLabel="Swap units"
        pending={swap.isPending}
        disabled={serials.length !== 1 || !scan.ok || scan.pending || !reason.trim()}
        onSubmit={() =>
          swap.mutate(
            {
              replacementSerial: serials[0],
              reason: reason.trim(),
              faultNote: faultNote.trim() || undefined,
              idempotencyKey,
            },
            {
              onSuccess: () => {
                toast.success('Units swapped');
                close();
              },
              onError: (error) => {
                toast.error(getErrorMessage(error));
                setIdempotencyKey(newIdempotencyKey());
              },
            },
          )
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------

export function SupplierReplacementDialog({ unit, open, onOpenChange }: DialogProps) {
  return (
    <Frame
      open={open}
      onOpenChange={onOpenChange}
      title="Register supplier replacement"
      description={
        <>
          Scan the unit the supplier sent in place of {unit.serialNumber}. This only labels it — record the
          replacement&apos;s stock first (Inventory → Stock adjustment, Stock In), otherwise it is refused.
        </>
      }
    >
      <SupplierReplacementBody unit={unit} close={() => onOpenChange(false)} />
    </Frame>
  );
}

function SupplierReplacementBody({ unit, close }: BodyProps) {
  const [serials, setSerials] = useState<string[]>([]);
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [scan, setScan] = useState<SerialScanState>(IDLE);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const replace = useSupplierReplacement(unit.id);
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>New unit&apos;s serial</Label>
          <SerialScanInput
            productId={unit.productId}
            context="RECEIVE"
            value={serials}
            onChange={setSerials}
            max={1}
            autoFocus
            onStateChange={setScan}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replacement-date">Received on</Label>
          <Input id="replacement-date" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replacement-notes">Note (optional)</Label>
          <Input id="replacement-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
      </div>
      <Footer
        close={close}
        submitLabel="Register replacement"
        pending={replace.isPending}
        disabled={serials.length !== 1 || !scan.ok || scan.pending || !receivedAt}
        onSubmit={() =>
          replace.mutate(
            {
              serial: serials[0],
              receivedAt: new Date(receivedAt).toISOString(),
              notes: notes.trim() || undefined,
              idempotencyKey,
            },
            {
              onSuccess: () => {
                toast.success('Replacement registered');
                close();
              },
              onError: (error) => {
                toast.error(getErrorMessage(error));
                setIdempotencyKey(newIdempotencyKey());
              },
            },
          )
        }
      />
    </>
  );
}
