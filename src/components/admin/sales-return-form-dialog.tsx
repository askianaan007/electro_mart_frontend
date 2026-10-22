'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrder } from '@/hooks/use-orders';
import { useCreateSalesReturn, useSalesReturnsForOrder, useUpdateSalesReturn } from '@/hooks/use-sales-returns';
import { useOrderUnits } from '@/hooks/use-product-units';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { getErrorMessage } from '@/lib/api/error';
import { serialKey } from '@/lib/serial';
import { cn, formatCurrency } from '@/lib/utils';
import type { Order, OrderUnitLine, ProductUnitCondition, SalesReturn } from '@/lib/api/types';

type SerialPick = { serial: string; condition: ProductUnitCondition; faultNote: string };

const schema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  returnDate: z.string().min(1, 'Date is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Select a product'),
        quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
      }),
    )
    .min(1, 'Add at least one item'),
});

type FormValues = z.infer<typeof schema>;

/**
 * The refund is never the original unit price — if the order had a
 * discount, the customer already paid less than that. This spells out the
 * math (original price, this line's share of the discount, and the actual
 * refund) so it's clear why the number is lower than the sale price.
 */
function RefundBreakdown({ order, productId, quantity }: { order: Order; productId: string; quantity: number }) {
  const orderItem = order.items.find((item) => item.productId === productId);
  if (!orderItem || !quantity) return null;

  const originalPrice = Number(orderItem.unitPrice);
  const netUnitPrice = Number(orderItem.netUnitPrice);
  const allocatedDiscount = (originalPrice - netUnitPrice) * quantity;
  const refundAmount = netUnitPrice * quantity;

  if (allocatedDiscount <= 0) {
    return (
      <p className="text-xs text-muted-foreground">Refund: {formatCurrency(refundAmount)} (no discount on this order)</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      <span>Original: {formatCurrency(originalPrice)} &times; {quantity}</span>
      <span className="text-destructive">−{formatCurrency(allocatedDiscount)} discount</span>
      <span className="font-medium text-foreground">= {formatCurrency(refundAmount)} refund</span>
    </div>
  );
}

export function SalesReturnFormDialog({
  open,
  onOpenChange,
  orderId,
  editingReturn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  editingReturn?: SalesReturn | null;
}) {
  const isEdit = !!editingReturn;
  const effectiveOrderId = editingReturn?.orderId ?? orderId;
  const createSalesReturn = useCreateSalesReturn();
  const updateSalesReturn = useUpdateSalesReturn();
  const pending = createSalesReturn.isPending || updateSalesReturn.isPending;
  const { data: order, isLoading: orderLoading } = useOrder(open ? (effectiveOrderId ?? undefined) : undefined);
  const { data: existingReturns } = useSalesReturnsForOrder(open ? (effectiveOrderId ?? undefined) : undefined);

  const remainingByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of order?.items ?? []) {
      map.set(item.productId, item.quantity);
    }
    for (const salesReturn of existingReturns ?? []) {
      if (isEdit && salesReturn.id === editingReturn!.id) continue;
      for (const item of salesReturn.items) {
        map.set(item.productId, (map.get(item.productId) ?? 0) - item.quantity);
      }
    }
    return map;
  }, [order, existingReturns, isEdit, editingReturn]);

  const returnableItems = (order?.items ?? []).filter((item) => (remainingByProduct.get(item.productId) ?? 0) > 0);

  // Serial picks per product (one picker per product, under its first row).
  const { data: orderUnits } = useOrderUnits(open ? (effectiveOrderId ?? undefined) : undefined);
  const [picks, setPicks] = useState<Record<string, SerialPick[]>>({});
  const [scanStates, setScanStates] = useState<Record<string, SerialScanState>>({});
  // Fresh serial picks each time the dialog opens (adjusted during render, not in an effect).
  const session = open ? `${orderId}:${editingReturn?.id ?? 'new'}` : null;
  const [pickSession, setPickSession] = useState<string | null>(null);
  if (session !== pickSession) {
    setPickSession(session);
    if (session) {
      const initial: Record<string, SerialPick[]> = {};
      for (const unit of editingReturn?.serials ?? []) {
        (initial[unit.productId] ??= []).push({
          serial: unit.serialNumber,
          condition: unit.condition,
          faultNote: unit.faultNote ?? '',
        });
      }
      setPicks(initial);
      setScanStates({});
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      returnDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: '', quantity: '1' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });

  useEffect(() => {
    if (open) {
      form.reset(
        editingReturn
          ? {
              reason: editingReturn.reason,
              returnDate: editingReturn.returnDate.slice(0, 10),
              items: editingReturn.items.map((item) => ({
                productId: item.productId,
                quantity: String(item.quantity),
              })),
            }
          : {
              reason: '',
              returnDate: new Date().toISOString().slice(0, 10),
              items: [{ productId: '', quantity: '1' }],
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, editingReturn?.id]);

  function remainingForRow(productId: string, rowIndex: number) {
    if (!productId) return null;
    const total = remainingByProduct.get(productId) ?? 0;
    const usedByOtherRows = (watchedItems ?? []).reduce((sum, row, i) => {
      if (i === rowIndex || row.productId !== productId) return sum;
      return sum + (Number(row.quantity) || 0);
    }, 0);
    return total - usedByOtherRows;
  }

  const editingSerialsByProduct = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const unit of editingReturn?.serials ?? []) {
      map.set(unit.productId, [...(map.get(unit.productId) ?? []), unit.serialNumber]);
    }
    return map;
  }, [editingReturn]);

  function quantityFor(productId: string) {
    return (watchedItems ?? []).reduce(
      (sum, row) => (row.productId === productId ? sum + (Number(row.quantity) || 0) : sum),
      0,
    );
  }

  /**
   * Same rule as the server: units of this line that never got a serial can
   * be returned without one; beyond that, each returned unit must be scanned.
   */
  function serialRule(productId: string) {
    const line = orderUnits?.find((l) => l.productId === productId);
    const editingSerials = editingSerialsByProduct.get(productId)?.length ?? 0;
    const editingQty = isEdit
      ? (editingReturn!.items.find((i) => i.productId === productId)?.quantity ?? 0)
      : 0;
    if (!line || (!line.product.trackSerials && line.assigned.length === 0 && editingSerials === 0)) return null;
    const soldWithSerial = line.assigned.filter((u) => u.status === 'SOLD').length + editingSerials;
    const unserialized = Math.max(0, line.required + editingQty - soldWithSerial);
    const qty = quantityFor(productId);
    return { line, min: Math.max(0, qty - unserialized), max: qty };
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!order) return;

    const productIds = [...new Set(values.items.map((i) => i.productId))];
    for (const productId of productIds) {
      const rule = serialRule(productId);
      const chosen = picks[productId] ?? [];
      const rowIndex = values.items.findIndex((i) => i.productId === productId);
      if (!rule) continue;
      if (chosen.length < rule.min) {
        form.setError(`items.${rowIndex}.quantity`, {
          message: `Scan at least ${rule.min} serial(s) — those units were sold with serials`,
        });
        return;
      }
      if (chosen.length > rule.max) {
        form.setError(`items.${rowIndex}.quantity`, { message: `${chosen.length} serials for ${rule.max} unit(s)` });
        return;
      }
      const state = scanStates[productId];
      if (state && (!state.ok || state.pending)) {
        form.setError(`items.${rowIndex}.quantity`, { message: 'Fix the serials marked in red first' });
        return;
      }
    }

    const usedByProduct = new Map<string, number>();
    for (let i = 0; i < values.items.length; i++) {
      const item = values.items[i];
      const qty = Number(item.quantity);
      const usedSoFar = usedByProduct.get(item.productId) ?? 0;
      const remaining = (remainingByProduct.get(item.productId) ?? 0) - usedSoFar;
      if (qty > remaining) {
        form.setError(`items.${i}.quantity`, {
          message: `Only ${Math.max(remaining, 0)} left to return`,
        });
        return;
      }
      usedByProduct.set(item.productId, usedSoFar + qty);
    }

    // Serials ride on the first row of their product.
    const seen = new Set<string>();
    const items = values.items.map((item) => {
      const first = !seen.has(item.productId);
      seen.add(item.productId);
      const chosen = first ? (picks[item.productId] ?? []) : [];
      return {
        productId: item.productId,
        quantity: Number(item.quantity),
        ...(chosen.length > 0 && {
          serials: chosen.map((p) => ({
            serial: p.serial,
            condition: p.condition,
            faultNote: p.faultNote.trim() || undefined,
          })),
        }),
      };
    });

    if (isEdit && editingReturn) {
      updateSalesReturn.mutate(
        { id: editingReturn.id, orderId: order.id, reason: values.reason, returnDate: values.returnDate, items },
        {
          onSuccess: () => {
            toast.success('Return updated');
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    } else {
      createSalesReturn.mutate(
        { orderId: order.id, reason: values.reason, returnDate: values.returnDate, items },
        {
          onSuccess: () => {
            toast.success('Return recorded — stock restored and dealer credited');
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit return' : 'Record sales return'} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit return from' : 'Return items from'} {order?.dealer.businessName}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {orderLoading || !order ? (
              <div className="space-y-2" aria-busy="true" aria-label="Loading order">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : order.status !== 'COMPLETED' ? (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Only completed orders can have items returned.
              </p>
            ) : returnableItems.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Every item on this order has already been fully returned.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Items to return</p>
                {fields.map((rowField, index) => {
                  const selectedProductId = watchedItems?.[index]?.productId ?? '';
                  const remaining = remainingForRow(selectedProductId, index);
                  const enteredQuantity = Number(watchedItems?.[index]?.quantity) || 0;
                  return (
                    <div key={rowField.id} className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>Product</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent searchable searchPlaceholder="Search items…">
                                  {returnableItems.map((item) => (
                                    <SelectItem key={item.productId} value={item.productId}>
                                      {item.product?.name ?? item.productId}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={remaining ?? undefined}
                                  className="w-24"
                                  {...field}
                                />
                              </FormControl>
                              {remaining !== null && (
                                <p className="text-xs text-muted-foreground">{remaining} returnable</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove item"
                          className="mt-6 text-muted-foreground hover:text-destructive"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {order && selectedProductId && (
                        <RefundBreakdown order={order} productId={selectedProductId} quantity={enteredQuantity} />
                      )}
                      {selectedProductId &&
                        (watchedItems ?? []).findIndex((r) => r.productId === selectedProductId) === index &&
                        (() => {
                          const rule = serialRule(selectedProductId);
                          if (!rule) return null;
                          return (
                            <ReturnSerialPicker
                              orderId={order.id}
                              line={rule.line}
                              min={rule.min}
                              max={rule.max}
                              picks={picks[selectedProductId] ?? []}
                              editingSerials={editingSerialsByProduct.get(selectedProductId)}
                              onChange={(next) => setPicks((prev) => ({ ...prev, [selectedProductId]: next }))}
                              onStateChange={(state) =>
                                setScanStates((prev) => ({ ...prev, [selectedProductId]: state }))
                              }
                            />
                          );
                        })()}
                    </div>
                  );
                })}
              </div>
            )}
            {order && (watchedItems ?? []).some((row) => row.productId && Number(row.quantity) > 0) && (
              <div className="flex justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm font-semibold">
                <span>Total refund</span>
                <span className="tabular-nums">
                  {formatCurrency(
                    (watchedItems ?? []).reduce((sum, row) => {
                      const orderItem = order.items.find((item) => item.productId === row.productId);
                      const qty = Number(row.quantity) || 0;
                      return orderItem ? sum + Number(orderItem.netUnitPrice) * qty : sum;
                    }, 0),
                  )}
                </span>
              </div>
            )}
            {order?.status === 'COMPLETED' && returnableItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '1' })}
              >
                <Plus />
                Add Item
              </Button>
            )}

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Not selling well, damaged, wrong item..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="returnDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={pending}
                disabled={order?.status !== 'COMPLETED' || returnableItems.length === 0}
              >
                {isEdit ? 'Save changes' : 'Record return'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ReturnSerialPicker({
  orderId,
  line,
  min,
  max,
  picks,
  editingSerials,
  onChange,
  onStateChange,
}: {
  orderId: string;
  line: OrderUnitLine;
  min: number;
  max: number;
  picks: SerialPick[];
  editingSerials?: string[];
  onChange: (next: SerialPick[]) => void;
  onStateChange: (state: SerialScanState) => void;
}) {
  const accepted = useMemo(
    () => (editingSerials?.length ? { serials: editingSerials, message: 'On this return' } : undefined),
    [editingSerials],
  );

  function setSerials(serials: string[]) {
    const byKey = new Map(picks.map((p) => [serialKey(p.serial), p]));
    onChange(serials.map((serial) => byKey.get(serialKey(serial)) ?? { serial, condition: 'GOOD', faultNote: '' }));
  }

  function update(index: number, patch: Partial<SerialPick>) {
    onChange(picks.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-xs font-semibold text-foreground">Returned serials</p>
        <p className="text-[11px] text-muted-foreground">
          {min > 0 ? `Scan at least ${min}` : 'Optional'} · {line.assigned.filter((u) => u.status === 'SOLD').length}{' '}
          sold with serials
        </p>
      </div>
      <SerialScanInput
        productId={line.productId}
        context="SALES_RETURN"
        orderId={orderId}
        value={picks.map((p) => p.serial)}
        onChange={setSerials}
        max={max || undefined}
        accepted={accepted}
        onStateChange={onStateChange}
      />
      {picks.length > 0 && (
        <ul className="space-y-1.5">
          {picks.map((pick, index) => (
            <li key={serialKey(pick.serial)} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] sm:items-center">
              <span className="truncate font-mono text-xs text-foreground">{pick.serial}</span>
              <div className="grid grid-cols-2 gap-0.5 rounded-md border border-border bg-muted/60 p-0.5 text-[11px]">
                {(['GOOD', 'DEFECTIVE'] as const).map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => update(index, { condition })}
                    aria-pressed={pick.condition === condition}
                    className={cn(
                      'rounded px-2 py-1 font-medium',
                      pick.condition === condition
                        ? condition === 'GOOD'
                          ? 'bg-card text-success shadow-xs'
                          : 'bg-card text-warning-foreground shadow-xs dark:text-warning'
                        : 'text-muted-foreground',
                    )}
                  >
                    {condition === 'GOOD' ? 'Good' : 'Defective'}
                  </button>
                ))}
              </div>
              <Input
                value={pick.faultNote}
                onChange={(e) => update(index, { faultNote: e.target.value })}
                placeholder={pick.condition === 'DEFECTIVE' ? 'What is wrong? e.g. no display' : 'Note (optional)'}
                className="h-8 text-xs"
                maxLength={500}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
