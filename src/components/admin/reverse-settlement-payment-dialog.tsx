'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useReverseSettlementPayment } from '@/hooks/use-commission';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({ reason: z.string().trim().min(3, 'Please provide a short reason (at least 3 characters)') });

/** Confirms reversing a PAID settlement's payout (controlled correction — nothing is deleted). */
export function ReverseSettlementPaymentDialog({
  open,
  onOpenChange,
  settlementId,
  settlementNumber,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementId: string;
  settlementNumber: string;
  amount: string;
}) {
  const reversePayment = useReverseSettlementPayment(settlementId);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) form.reset({ reason: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit((values) => {
    reversePayment.mutate(values.reason, {
      onSuccess: () => {
        toast.success(`Payment of ${settlementNumber} reversed`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reverse settlement payment">
        <DialogHeader>
          <DialogTitle>Reverse the payment of {settlementNumber}?</DialogTitle>
          <DialogDescription>Use this when a recorded payout didn&apos;t actually go through or was a mistake.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 rounded-lg border border-warning/25 bg-warning/10 p-3 pl-7 text-xs text-warning-foreground dark:text-warning">
          <li>The payout expense stays in the books exactly as recorded.</li>
          <li>
            A reversal adjustment of <span className="font-medium tabular-nums">{formatCurrency(amount)}</span> is
            posted to Liquid Cash today, as money returned.
          </li>
          <li>The commission lines go back to pending so they can be settled again.</li>
          <li>The settlement is marked Reversed and can&apos;t be changed afterwards.</li>
        </ul>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={reversePayment.isPending}>
                Reverse payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
