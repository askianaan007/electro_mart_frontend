'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrder } from '@/hooks/use-orders';
import { useCreateSalesReturn, useSalesReturnsForOrder, useUpdateSalesReturn } from '@/hooks/use-sales-returns';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Order, SalesReturn } from '@/lib/api/types';

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

  const onSubmit = form.handleSubmit((values) => {
    if (!order) return;

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

    const items = values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }));

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
              <p className="p-3 text-sm text-muted-foreground">Loading order…</p>
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
                {fields.map((rowField, index) => {
                  const selectedProductId = watchedItems?.[index]?.productId ?? '';
                  const remaining = remainingForRow(selectedProductId, index);
                  const enteredQuantity = Number(watchedItems?.[index]?.quantity) || 0;
                  return (
                    <div key={rowField.id} className="space-y-1.5 rounded-lg border border-border p-2.5">
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
                                <SelectContent>
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
                          className="mt-6"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      {order && selectedProductId && (
                        <RefundBreakdown order={order} productId={selectedProductId} quantity={enteredQuantity} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {order && (watchedItems ?? []).some((row) => row.productId && Number(row.quantity) > 0) && (
              <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-sm font-semibold">
                <span>Total refund</span>
                <span>
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
