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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useReverseCashAdjustment } from '@/hooks/use-cash-adjustments';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { CashAdjustment } from '@/lib/api/types';

const schema = z.object({
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters'),
  password: z.string().min(1, 'Your password is required'),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { reason: '', password: '' };

/** Confirms reversing an opening balance or cash adjustment — posts an equal and opposite entry, nothing is deleted. */
export function ReverseCashAdjustmentDialog({
  open,
  onOpenChange,
  adjustment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: CashAdjustment | null;
}) {
  const reverseAdjustment = useReverseCashAdjustment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (!adjustment) return;
    form.clearErrors('root');
    reverseAdjustment.mutate(
      { id: adjustment.id, reason: values.reason.trim(), password: values.password },
      {
        onSuccess: (reversal) => {
          toast.success(`${adjustment.adjustmentNumber} reversed by ${reversal.adjustmentNumber}`);
          onOpenChange(false);
        },
        onError: (error) => {
          // A wrong password is a 403 — keep the dialog open and flag the field itself.
          if (error instanceof ApiError && error.statusCode === 403) {
            form.setError('password', { message: error.message || 'Incorrect password' });
            form.setValue('password', '');
            return;
          }
          form.setError('root', { message: getErrorMessage(error) });
        },
      },
    );
  });

  const rootError = form.formState.errors.root?.message;
  const amount = adjustment ? Number(adjustment.amount) : 0;
  const isOpening = adjustment?.type === 'OPENING_BALANCE';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reverse cash adjustment">
        <DialogHeader>
          <DialogTitle>Reverse {adjustment?.adjustmentNumber ?? 'adjustment'}?</DialogTitle>
          <DialogDescription>
            Use this when the {isOpening ? 'opening balance' : 'adjustment'} was recorded with the wrong amount or date.
          </DialogDescription>
        </DialogHeader>
        {adjustment && (
          <ul className="list-disc space-y-1 rounded-lg border border-warning/25 bg-warning/10 p-3 pl-7 text-xs text-warning-foreground dark:text-warning">
            <li>The original entry stays in the history exactly as recorded.</li>
            <li>
              A reversal of{' '}
              <span className="font-medium tabular-nums">
                {-amount >= 0 ? '+' : '−'}
                {formatCurrency(Math.abs(amount))}
              </span>{' '}
              is posted to Liquid Cash, cancelling it out.
            </li>
            {isOpening && <li>You can then set the opening balance again with the correct figure.</li>}
            <li>A reversal can&apos;t itself be reversed.</li>
          </ul>
        )}
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormDescription>Required to confirm a change to the cash balance.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {rootError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {rootError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={reverseAdjustment.isPending} disabled={!adjustment}>
                Reverse
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
