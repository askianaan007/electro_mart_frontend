'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCancelPurchase } from '@/hooks/use-purchases';
import { useSupplierCreditDetail } from '@/hooks/use-credits';
import { getErrorMessage } from '@/lib/api/error';
import { businessToday, cn, formatCurrency } from '@/lib/utils';
import type { Purchase, PurchaseReturn } from '@/lib/api/types';

const schema = z
  .object({
    reason: z.string().trim().min(3, 'Please give a short reason'),
    cancelDate: z.string().min(1, 'Date is required'),
  })
  .refine((v) => v.cancelDate <= businessToday(), {
    path: ['cancelDate'],
    message: 'Date cannot be in the future',
  });

type FormValues = z.infer<typeof schema>;

/** Units of each line not yet returned, priced at the purchase's own cost — what cancelling sends back. */
export function remainingToReturn(purchase: Purchase, returns: PurchaseReturn[]) {
  const returned = new Map<string, number>();
  for (const r of returns) {
    for (const item of r.items) returned.set(item.productId, (returned.get(item.productId) ?? 0) + item.quantity);
  }
  return purchase.items
    .map((item) => {
      const already = Math.min(item.quantity, returned.get(item.productId) ?? 0);
      returned.set(item.productId, (returned.get(item.productId) ?? 0) - already);
      const quantity = item.quantity - already;
      return { item, quantity, value: quantity * Number(item.unitCost) };
    })
    .filter((line) => line.quantity > 0);
}

/** A supplier balance in words: positive = we owe them, negative = they owe us. */
export function describeBalance(balance: number) {
  if (balance > 0) return `You owe ${formatCurrency(balance)}`;
  if (balance < 0) return `They owe you ${formatCurrency(-balance)}`;
  return 'Settled';
}

/**
 * Calls an order off. The backend sends every unit still held back to the
 * supplier as one cancellation return; money already paid stays as the
 * supplier's credit until a refund is recorded.
 */
export function CancelPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  returns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  returns: PurchaseReturn[];
}) {
  const cancelPurchase = useCancelPurchase();
  const { data: credit } = useSupplierCreditDetail(open ? purchase.supplierId : undefined);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', cancelDate: businessToday() },
  });

  useEffect(() => {
    if (open) form.reset({ reason: '', cancelDate: businessToday() });
  }, [open, form]);

  const lines = remainingToReturn(purchase, returns);
  const returnValue = lines.reduce((sum, line) => sum + line.value, 0);
  const balanceBefore = credit ? Number(credit.creditBalance) : null;
  const balanceAfter = balanceBefore === null ? null : balanceBefore - returnValue;
  const supplierName = purchase.supplier.name;

  const onSubmit = form.handleSubmit((values) => {
    cancelPurchase.mutate(
      { id: purchase.id, reason: values.reason.trim(), cancelDate: values.cancelDate },
      {
        onSuccess: () => {
          toast.success(`Order #${purchase.invoiceNumber} cancelled`);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Cancel order">
        <DialogHeader>
          <DialogTitle>Cancel order #{purchase.invoiceNumber}?</DialogTitle>
          <DialogDescription>
            Everything still held from this order goes back to {supplierName}. You can reinstate the order later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          {lines.length === 0 ? (
            <p className="text-muted-foreground">
              Every unit has already been returned — the order is only marked cancelled.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lines.map(({ item, quantity, value }) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words">
                    {quantity} &times; {item.product?.name ?? item.productId}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatCurrency(value)}</span>
                </li>
              ))}
            </ul>
          )}
          {balanceBefore !== null && balanceAfter !== null && (
            <dl className="space-y-1.5 border-t border-border pt-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Balance with {supplierName} now</dt>
                <dd className="tabular-nums">{describeBalance(balanceBefore)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-medium">
                <dt>After cancelling</dt>
                <dd className={cn('tabular-nums', balanceAfter < 0 && 'text-success')}>
                  {describeBalance(balanceAfter)}
                </dd>
              </div>
            </dl>
          )}
          {balanceAfter !== null && balanceAfter < 0 && (
            <p className="text-xs text-muted-foreground">
              Liquid Cash doesn&apos;t change now. Record the refund on this page when {supplierName} actually pays it
              back — by cheque, it counts only once cleared.
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Supplier couldn't deliver on time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancelDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goods returned on</FormLabel>
                  <FormControl>
                    <Input type="date" max={businessToday()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Keep order
              </Button>
              <Button type="submit" variant="destructive" loading={cancelPurchase.isPending}>
                Cancel order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
