'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateCashAdjustment } from '@/hooks/use-cash-adjustments';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error';
import { businessToday } from '@/lib/utils';

export type CashAdjustmentKind = 'OPENING_BALANCE' | 'ADJUSTMENT';

const schema = z.object({
  amount: z
    .string()
    .trim()
    .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) !== 0, 'Enter a non-zero amount')
    .refine((v) => /^[+-]?\d+(\.\d{1,2})?$/.test(v), 'Use at most 2 decimal places'),
  adjustmentDate: z
    .string()
    .min(1, 'Date is required')
    // Evaluated at validation time so a dialog left open past midnight still uses the right day.
    .refine((v) => v <= businessToday(), 'Date cannot be in the future'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters'),
  evidenceReference: z.string().trim().min(3, 'Evidence reference must be at least 3 characters'),
  password: z.string().min(1, 'Your password is required'),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(kind: CashAdjustmentKind): FormValues {
  return {
    // Amounts are never prefilled — the admin types exactly what the evidence shows.
    amount: '',
    // An opening balance has to sit on/before the first cash entry, so don't guess a date for it.
    adjustmentDate: kind === 'ADJUSTMENT' ? businessToday() : '',
    reason: '',
    evidenceReference: '',
    password: '',
  };
}

const COPY: Record<CashAdjustmentKind, { title: string; description: string; amountHint: string; dateHint: string; submit: string; success: string }> = {
  OPENING_BALANCE: {
    title: 'Set opening balance',
    description:
      'The cash the business already held before the first entry recorded in this system. It can be set only once — reverse it to correct it.',
    amountHint: 'Positive for cash on hand, negative for an overdraft. Cannot be zero.',
    dateHint: 'Must be on or before the first cash entry in the history.',
    submit: 'Set opening balance',
    success: 'Opening balance recorded',
  },
  ADJUSTMENT: {
    title: 'Record cash adjustment',
    description:
      'An evidenced correction for a cash difference that has no other source record (e.g. a cash count or bank reconciliation difference).',
    amountHint: '+ adds cash to the balance, − removes cash from it.',
    dateHint: 'The date the difference was identified. Cannot be in the future.',
    submit: 'Record adjustment',
    success: 'Cash adjustment recorded',
  },
};

export function CashAdjustmentDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CashAdjustmentKind;
}) {
  const createAdjustment = useCreateCashAdjustment();
  const copy = COPY[kind];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(kind),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(kind));
  }, [open, kind, form]);

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors('root');
    createAdjustment.mutate(
      {
        type: kind,
        amount: Number(values.amount),
        adjustmentDate: values.adjustmentDate,
        reason: values.reason.trim(),
        evidenceReference: values.evidenceReference.trim(),
        password: values.password,
      },
      {
        onSuccess: () => {
          toast.success(copy.success);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={copy.title}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" inputMode="decimal" className="tabular-nums" {...field} />
                    </FormControl>
                    <FormDescription>{copy.amountHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adjustmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" max={businessToday()} {...field} />
                    </FormControl>
                    <FormDescription>{copy.dateHint}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Why this adjustment is needed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evidenceReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Evidence reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank statement / cash count sheet reference" {...field} />
                  </FormControl>
                  <FormDescription>Where the supporting document can be found.</FormDescription>
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
              <Button type="submit" loading={createAdjustment.isPending}>
                {copy.submit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
