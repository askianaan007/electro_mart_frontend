'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Minus, PackageCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateReplacementReceipt, useUpdateReplacementReceipt } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency } from '@/lib/utils';
import type { PurchaseReturn, ReplacementReceipt } from '@/lib/api/types';

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback for non-secure contexts.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function ownQuantities(receipt: ReplacementReceipt) {
  const map: Record<string, string> = {};
  for (const item of receipt.items) {
    map[item.purchaseReturnItemId] = String(Number(map[item.purchaseReturnItemId] || 0) + item.quantity);
  }
  return map;
}

// Local calendar date — toISOString() would be yesterday's date in the early
// hours for timezones ahead of UTC, wrongly blocking today as "future".
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Receive goods the supplier sent in place of a return — or, with
 * `editingReceipt`, correct one (wrong count, wrong line/product, wrong
 * date). Quantity per line is capped at what's still outstanding; the unit
 * cost is the returned line's cost and isn't editable (the server ignores
 * any price anyway), so value and supplier balance follow the quantities.
 */
export function ReplacementReceiptFormDialog({
  open,
  onOpenChange,
  purchaseReturn,
  editingReceipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseReturn: PurchaseReturn | null;
  editingReceipt?: ReplacementReceipt | null;
}) {
  const isEdit = !!editingReceipt;
  const createReceipt = useCreateReplacementReceipt();
  const updateReceipt = useUpdateReplacementReceipt();
  const pending = createReceipt.isPending || updateReceipt.isPending;
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [receivedDate, setReceivedDate] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  // One key per dialog session: a retry after a timeout or a double-click
  // resends the same key, and the server answers with the receipt it
  // already recorded instead of receiving the goods twice.
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    if (open) {
      idempotencyKey.current = newIdempotencyKey();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuantities(editingReceipt ? ownQuantities(editingReceipt) : {});
      setReceivedDate(editingReceipt ? editingReceipt.receivedDate.slice(0, 10) : today());
      setReference(editingReceipt?.reference ?? '');
      setNotes(editingReceipt?.notes ?? '');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchaseReturn?.id, editingReceipt?.id]);

  // What the receipt being edited currently holds per return line — it's
  // "given back" to the line's allowance so it can be re-entered or moved.
  const own = editingReceipt ? ownQuantities(editingReceipt) : {};

  const lines = (purchaseReturn?.items ?? []).map((item) => {
    const ownQty = Number(own[item.id] || 0);
    const received = (item.receivedQuantity ?? 0) - ownQty;
    const remaining = (item.remainingQuantity ?? item.quantity - (item.receivedQuantity ?? 0)) + ownQty;
    const qty = Number(quantities[item.id] || 0);
    return {
      item,
      received,
      remaining,
      qty,
      lineTotal: qty * Number(item.unitCost),
    };
  });
  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalValue = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const anyRemaining = isEdit || lines.some((l) => l.remaining > 0);
  const oldValue = Number(editingReceipt?.totalAmount ?? 0);
  const minDate = purchaseReturn?.returnDate.slice(0, 10);

  function setQuantity(returnItemId: string, value: string) {
    setQuantities((q) => ({ ...q, [returnItemId]: value }));
  }

  function receiveAllRemaining() {
    setQuantities(
      Object.fromEntries(lines.filter((l) => l.remaining > 0).map((l) => [l.item.id, String(l.remaining)])),
    );
  }

  function handleSubmit() {
    if (!purchaseReturn) return;
    setError(null);
    for (const line of lines) {
      if (!Number.isInteger(line.qty) || line.qty < 0) {
        setError('Quantities must be whole numbers');
        return;
      }
      if (line.qty > line.remaining) {
        setError(`${line.item.product?.name ?? 'A line'}: only ${line.remaining} remaining to be replaced`);
        return;
      }
    }
    if (totalUnits === 0) {
      setError('Enter the quantity received for at least one line');
      return;
    }
    if (!receivedDate) {
      setError('Received date is required');
      return;
    }
    if (minDate && receivedDate < minDate) {
      setError('Received date cannot be before the return date');
      return;
    }

    const items = lines.filter((l) => l.qty > 0).map((l) => ({ purchaseReturnItemId: l.item.id, quantity: l.qty }));

    if (editingReceipt) {
      updateReceipt.mutate(
        {
          id: editingReceipt.id,
          receivedDate,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          items,
        },
        {
          onSuccess: (receipt) => {
            toast.success(`Replacement ${receipt.replacementNumber} updated — stock and supplier balance adjusted`);
            onOpenChange(false);
          },
          onError: (err) => setError(getErrorMessage(err)),
        },
      );
      return;
    }

    createReceipt.mutate(
      {
        purchaseReturnId: purchaseReturn.id,
        idempotencyKey: idempotencyKey.current,
        receivedDate,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        items,
      },
      {
        onSuccess: (receipt) => {
          toast.success(`Replacement ${receipt.replacementNumber} received — stock and supplier balance updated`);
          onOpenChange(false);
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEdit ? 'Edit replacement' : 'Receive replacement'}
        className="max-h-[calc(100dvh-1rem)] max-w-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? `Edit ${editingReceipt?.replacementNumber} (return ${purchaseReturn?.returnNumber ?? ''})`
              : `Receive replacement for ${purchaseReturn?.returnNumber ?? ''}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Correct the quantities, move them to the right product line, or fix the date/ref. Stock, the receipt value and the supplier balance are adjusted by the difference.'
              : `Record the goods ${purchaseReturn?.supplier?.name ?? 'the supplier'} sent in place of this return. Units go back into stock and their value is added back to the supplier balance.`}
          </DialogDescription>
        </DialogHeader>

        {!anyRemaining ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Every line on this return has already been fully replaced.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Desktop: one row per return line */}
            <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">{isEdit ? 'Other receipts' : 'Received'}</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Unit cost</TableHead>
                    <TableHead>{isEdit ? 'This receipt' : 'Receive now'}</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.item.id}>
                      <TableCell className="whitespace-normal break-words">
                        {line.item.product?.name ?? line.item.productId}
                      </TableCell>
                      <TableCell className="text-right">{line.item.quantity}</TableCell>
                      <TableCell className="text-right">{line.received}</TableCell>
                      <TableCell className="text-right font-medium">{line.remaining}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.item.unitCost)}</TableCell>
                      <TableCell>
                        <QuantityStepper
                          value={quantities[line.item.id] ?? ''}
                          max={line.remaining}
                          label={line.item.product?.name ?? 'line'}
                          onChange={(v) => setQuantity(line.item.id, v)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {line.qty > 0 ? formatCurrency(line.lineTotal) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: one card per return line, touch-sized stepper */}
            <div className="space-y-2 sm:hidden">
              {lines.map((line) => (
                <div
                  key={line.item.id}
                  className={cn(
                    'rounded-lg border p-3',
                    line.qty > 0 ? 'border-primary/40 bg-primary/5' : 'border-border',
                    line.remaining === 0 && 'opacity-60',
                  )}
                >
                  <p className="break-words text-sm font-medium">{line.item.product?.name ?? line.item.productId}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Returned</dt>
                      <dd className="font-medium">{line.item.quantity}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{isEdit ? 'Other rcpts' : 'Received'}</dt>
                      <dd className="font-medium">{line.received}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Remaining</dt>
                      <dd className="font-semibold">{line.remaining}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{isEdit ? 'This receipt' : 'Receive now'}</p>
                      <QuantityStepper
                        value={quantities[line.item.id] ?? ''}
                        max={line.remaining}
                        label={line.item.product?.name ?? 'line'}
                        onChange={(v) => setQuantity(line.item.id, v)}
                      />
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">@ {formatCurrency(line.item.unitCost)}</p>
                      <p className="text-sm font-semibold">{line.qty > 0 ? formatCurrency(line.lineTotal) : '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={receiveAllRemaining}
            >
              Receive all remaining
            </Button>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="replacement-date">Received date</Label>
                <Input
                  id="replacement-date"
                  type="date"
                  value={receivedDate}
                  min={minDate}
                  max={today()}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="replacement-reference">Supplier delivery note / ref (optional)</Label>
                <Input
                  id="replacement-reference"
                  value={reference}
                  maxLength={200}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="replacement-notes">Notes (optional)</Label>
              <Textarea
                id="replacement-notes"
                rows={2}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {isEdit ? (
              <p className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                <PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Receipt value <strong>{formatCurrency(oldValue)}</strong> →{' '}
                  <strong>{formatCurrency(totalValue)}</strong>. {purchaseReturn?.supplier?.name ?? 'The supplier'}
                  &apos;s balance changes by{' '}
                  <strong>
                    {totalValue - oldValue >= 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(totalValue - oldValue))}
                  </strong>
                  ; stock moves only by the per-product difference. To remove the receipt entirely, use Void.
                </span>
              </p>
            ) : (
              totalUnits > 0 && (
                <p className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                  <PackageCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Adds <strong>{totalUnits}</strong> unit
                    {totalUnits === 1 ? '' : 's'} to stock and <strong>{formatCurrency(totalValue)}</strong> back to{' '}
                    {purchaseReturn?.supplier?.name ?? 'the supplier'}&apos;s balance.
                  </span>
                </p>
              )
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {/* Sticky on mobile so the action is always reachable on long returns */}
        <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card px-5 py-3 sm:static sm:m-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={pending} disabled={!anyRemaining || totalUnits === 0}>
            {isEdit ? 'Save changes' : 'Receive replacement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** − [qty] + with 44px touch targets on phones, compact from `sm` up. */
function QuantityStepper({
  value,
  max,
  label,
  onChange,
}: {
  value: string;
  max: number;
  label: string;
  onChange: (value: string) => void;
}) {
  const n = Number(value || 0);
  const disabled = max === 0 && n === 0;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 sm:size-9"
        disabled={disabled || n <= 0}
        onClick={() => onChange(String(Math.max(0, n - 1)))}
        aria-label={`Decrease quantity for ${label}`}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        disabled={disabled}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-16 text-center sm:h-9"
        aria-label={`Quantity for ${label}`}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 sm:size-9"
        disabled={disabled || n >= max}
        onClick={() => onChange(String(Math.min(max, n + 1)))}
        aria-label={`Increase quantity for ${label}`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
