'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DuplicateConfirmDialog } from '@/components/admin/duplicate-confirm-dialog';
import { undoErrorMessage, useCreatePayment, useUndoPayment, useUpdatePayment } from '@/hooks/use-payments';
import { isPossibleDuplicate } from '@/lib/api/duplicate';
import { getErrorMessage } from '@/lib/api/error';
import { businessToday, formatCurrency } from '@/lib/utils';
import type { Invoice, Payment } from '@/lib/api/types';

const schema = z
  .object({
    // Mirrors the backend: > 0, at most 2 decimals, ≤ 1,000,000,000.
    amount: z
      .string()
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0, 'Enter a valid amount (up to 2 decimals)')
      .refine((v) => Number(v) <= 1_000_000_000, 'Amount cannot exceed 1,000,000,000'),
    mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
    reference: z.string(),
    paymentDate: z.string().min(1, 'Payment date is required'),
    bankName: z.string(),
    chequeNumber: z.string(),
    chequeDate: z.string(),
    collectedDate: z.string(),
    remarks: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentDate && data.paymentDate > businessToday()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentDate'], message: 'Payment date cannot be in the future' });
    }
    if (data.mode !== 'CHEQUE') return;
    if (!data.bankName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bankName'], message: 'Bank name is required for cheques' });
    }
    if (!data.chequeNumber.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeNumber'], message: 'Cheque number is required' });
    }
    if (!data.chequeDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeDate'], message: 'Cheque date is required' });
    }
    if (!data.collectedDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['collectedDate'], message: 'Collected date is required' });
    } else if (data.collectedDate > businessToday()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['collectedDate'], message: 'Collected date cannot be in the future' });
    }
  });

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(payment?: Payment | null): FormValues {
  return {
    amount: payment ? String(payment.amount) : '',
    mode: payment?.mode ?? 'CASH',
    reference: payment?.reference ?? '',
    paymentDate: payment ? payment.paymentDate.slice(0, 10) : businessToday(),
    bankName: payment?.bankName ?? '',
    chequeNumber: payment?.chequeNumber ?? '',
    chequeDate: payment?.chequeDate ? payment.chequeDate.slice(0, 10) : '',
    collectedDate: payment?.collectedDate ? payment.collectedDate.slice(0, 10) : businessToday(),
    remarks: payment?.remarks ?? '',
  };
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice | null;
  payment?: Payment | null;
}) {
  const isEdit = !!payment;
  const effectiveInvoice = payment?.invoice ?? invoice ?? null;
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const undoPayment = useUndoPayment();
  const pending = createPayment.isPending || updatePayment.isPending;
  // Set when the backend flags the new payment as a POSSIBLE_DUPLICATE: the
  // exact body that was refused, resent with confirmDuplicate only on confirm.
  const [duplicate, setDuplicate] = useState<{
    message: string;
    body: Parameters<typeof createPayment.mutate>[0];
  } | null>(null);

  // A RETURNED (bounced) cheque never paid anything, so it doesn't eat into
  // what's left on the invoice — mirrors isEffectivePayment on the backend.
  const counts = (p: Pick<Payment, 'mode' | 'chequeStatus'>) => !(p.mode === 'CHEQUE' && p.chequeStatus === 'RETURNED');
  const alreadyPaid = (effectiveInvoice?.payments ?? []).reduce(
    (sum, p) => (counts(p) ? sum + Number(p.amount) : sum),
    0,
  );
  const ownAmount = payment && counts(payment) ? Number(payment.amount) : 0;
  // netGrandTotal (grandTotal minus any sales returns) is what's actually
  // owed — falling back to grandTotal only for the rare case a caller
  // didn't include it, not because gross is ever the right default.
  const remaining = effectiveInvoice
    ? Number(effectiveInvoice.netGrandTotal ?? effectiveInvoice.grandTotal) - alreadyPaid + ownAmount
    : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(payment),
  });

  useEffect(() => {
    if (open) {
      setDuplicate(null);
      form.reset(
        payment
          ? defaultValuesFor(payment)
          : { ...defaultValuesFor(null), amount: remaining > 0 ? String(remaining) : '' },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment?.id, effectiveInvoice?.id]);

  const mode = form.watch('mode');

  function submitCreate(body: Parameters<typeof createPayment.mutate>[0]) {
    createPayment.mutate(body, {
      onSuccess: () => {
        setDuplicate(null);
        toast.success('Payment recorded');
        onOpenChange(false);
      },
      onError: (error) => {
        if (isPossibleDuplicate(error) && !body.confirmDuplicate) {
          setDuplicate({ message: error.message, body });
          return;
        }
        setDuplicate(null);
        toast.error(getErrorMessage(error));
      },
    });
  }

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      amount: Number(values.amount),
      mode: values.mode,
      reference: values.reference || undefined,
      paymentDate: values.paymentDate,
      bankName: values.mode === 'CHEQUE' ? values.bankName : undefined,
      chequeNumber: values.mode === 'CHEQUE' ? values.chequeNumber : undefined,
      chequeDate: values.mode === 'CHEQUE' ? values.chequeDate : undefined,
      collectedDate: values.mode === 'CHEQUE' ? values.collectedDate : undefined,
      remarks: values.remarks || undefined,
    };

    if (isEdit && payment) {
      updatePayment.mutate(
        { id: payment.id, ...payload },
        {
          onSuccess: (updated) => {
            // Pin the undo to this edit's revision when the response carries it.
            const revisionId = updated?.lastChange?.id;
            toast.success('Payment updated', {
              action: {
                label: 'Undo',
                onClick: () =>
                  undoPayment.mutate(
                    { id: payment.id, revisionId },
                    {
                      onSuccess: () => toast.success('Edit undone'),
                      onError: (error) => toast.error(undoErrorMessage(error)),
                    },
                  ),
              },
            });
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    } else {
      if (!effectiveInvoice) return;
      submitCreate({ invoiceId: effectiveInvoice.id, ...payload });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit payment' : 'Record payment'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit payment' : 'Record a payment'}</DialogTitle>
        </DialogHeader>
        {effectiveInvoice && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Invoice</p>
              <p className="truncate font-medium">{effectiveInvoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Remaining balance</p>
              <p className="font-semibold tabular-nums">{formatCurrency(Math.max(remaining, 0))}</p>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount received</FormLabel>
                  <FormControl>
                    <Input type="number" min={0.01} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment date</FormLabel>
                    <FormControl>
                      <Input type="date" max={businessToday()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'CHEQUE' && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Cheque details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank name</FormLabel>
                        <FormControl>
                          <Input placeholder="Commercial Bank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chequeNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cheque number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="collectedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collected date</FormLabel>
                        <FormControl>
                          <Input type="date" max={businessToday()} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chequeDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cheque date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription>
                  The dealer&apos;s balance drops immediately; the amount only counts toward Liquid Cash once this
                  cheque is marked cleared, and reverses if it&apos;s returned.
                </FormDescription>
              </div>
            )}

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Save payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        <DuplicateConfirmDialog
          message={duplicate?.message ?? null}
          pending={createPayment.isPending}
          onCancel={() => setDuplicate(null)}
          onConfirm={() => duplicate && submitCreate({ ...duplicate.body, confirmDuplicate: true })}
        />
      </DialogContent>
    </Dialog>
  );
}
