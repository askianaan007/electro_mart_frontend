'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DuplicateConfirmDialog } from '@/components/admin/duplicate-confirm-dialog';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useAllSuppliers } from '@/hooks/use-suppliers';
import { useCreateRefund, useRefundAvailable, type RefundInput } from '@/hooks/use-refunds';
import { getErrorMessage } from '@/lib/api/error';
import { isPossibleDuplicate } from '@/lib/api/duplicate';
import { businessToday, cn, formatCurrency } from '@/lib/utils';

const MAX_AMOUNT = 1_000_000_000;

const schema = z
  .object({
    party: z.enum(['DEALER', 'SUPPLIER']),
    counterpartyId: z.string().min(1, 'Choose who the refund is with'),
    amount: z
      .string()
      .refine((v) => Number(v) > 0, 'Enter a valid amount')
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), 'Use at most 2 decimal places')
      .refine((v) => Number(v) <= MAX_AMOUNT, 'Amount is too large'),
    mode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE']),
    refundDate: z.string().min(1, 'Refund date is required'),
    reason: z.string().trim().min(3, 'Please give a short reason'),
    reference: z.string(),
    chequeNumber: z.string(),
    bankName: z.string(),
    chequeDate: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.refundDate > businessToday()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['refundDate'], message: 'Refund date cannot be in the future' });
    }
    if (data.mode !== 'CHEQUE') return;
    if (!data.chequeNumber.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeNumber'], message: 'Cheque number is required' });
    }
    if (!data.bankName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bankName'], message: 'Bank name is required for cheques' });
    }
    if (!data.chequeDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeDate'], message: 'Cheque date is required' });
    }
  });

type FormValues = z.infer<typeof schema>;

function defaultValues(): FormValues {
  return {
    party: 'DEALER',
    counterpartyId: '',
    amount: '',
    mode: 'CASH',
    refundDate: businessToday(),
    reason: '',
    reference: '',
    chequeNumber: '',
    bankName: '',
    chequeDate: '',
  };
}

/**
 * Records a refund: paying back a dealer who holds a credit with us (cash
 * out), or a supplier paying back a credit they owe us (cash in). The amount
 * is capped at the party's current credit, fetched from the backend.
 */
export function RefundFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createRefund = useCreateRefund();
  const { data: dealers } = useAllCustomer();
  const { data: suppliers } = useAllSuppliers();
  // The body refused as a possible duplicate, kept so a confirmation resends it unchanged.
  const [duplicate, setDuplicate] = useState<{ message: string; body: RefundInput } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues());
      setDuplicate(null);
    }
  }, [open, form]);

  const party = form.watch('party');
  const counterpartyId = form.watch('counterpartyId');
  const mode = form.watch('mode');
  const available = useRefundAvailable(party, counterpartyId || undefined);
  const availableCredit = available.data ? Number(available.data.availableCredit) : null;
  const noCredit = availableCredit !== null && availableCredit <= 0;
  const isDealer = party === 'DEALER';

  function submit(body: RefundInput) {
    createRefund.mutate(body, {
      onSuccess: (refund) => {
        toast.success(`Refund ${refund.refundNumber} recorded`);
        setDuplicate(null);
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
    const amount = Number(values.amount);
    if (availableCredit === null) {
      toast.error('Still checking the available credit — try again in a moment');
      return;
    }
    if (amount > availableCredit) {
      form.setError('amount', { message: `Cannot exceed the available credit of ${formatCurrency(availableCredit)}` });
      return;
    }
    const isCheque = values.mode === 'CHEQUE';
    submit({
      party: values.party,
      dealerId: values.party === 'DEALER' ? values.counterpartyId : undefined,
      supplierId: values.party === 'SUPPLIER' ? values.counterpartyId : undefined,
      amount,
      mode: values.mode,
      refundDate: values.refundDate,
      reason: values.reason.trim(),
      reference: values.reference.trim() || undefined,
      chequeNumber: isCheque ? values.chequeNumber.trim() : undefined,
      bankName: isCheque ? values.bankName.trim() : undefined,
      chequeDate: isCheque ? values.chequeDate : undefined,
    });
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title="Record refund">
          <DialogHeader>
            <DialogTitle>Record a refund</DialogTitle>
            <DialogDescription>
              Pay back a customer who holds a credit with you, or record a supplier paying back a credit they owe you.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="party"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund with</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue('counterpartyId', '');
                          form.clearErrors(['counterpartyId', 'amount']);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEALER">Customer (we pay out)</SelectItem>
                          <SelectItem value="SUPPLIER">Supplier (we receive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="counterpartyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDealer ? 'Customer' : 'Supplier'}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.clearErrors('amount');
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isDealer ? 'Select customer' : 'Select supplier'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent
                          searchable
                          searchPlaceholder={isDealer ? 'Search customers…' : 'Search suppliers…'}
                        >
                          {isDealer
                            ? dealers?.data.map((dealer) => (
                                <SelectItem key={dealer.id} value={dealer.id}>
                                  {dealer.businessName}
                                </SelectItem>
                              ))
                            : suppliers?.data.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {counterpartyId && (
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm',
                    noCredit ? 'border-warning/30 bg-warning/10' : 'border-border bg-muted/40',
                  )}
                >
                  {available.isLoading ? (
                    <span className="text-muted-foreground">Checking available credit…</span>
                  ) : available.isError ? (
                    <span className="text-destructive">{getErrorMessage(available.error)}</span>
                  ) : noCredit ? (
                    <span>
                      No credit to refund —{' '}
                      {isDealer ? 'this customer doesn’t hold a credit with you.' : 'this supplier doesn’t owe you a credit.'}
                    </span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">Available to refund</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(availableCredit ?? 0)}</span>
                    </>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDealer ? 'Amount paid out' : 'Amount received'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.01}
                          max={availableCredit && availableCredit > 0 ? availableCredit : undefined}
                          step="0.01"
                          className="tabular-nums"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="refundDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund date</FormLabel>
                      <FormControl>
                        <Input type="date" max={businessToday()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
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
              </div>

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
                  <FormDescription>
                    The {isDealer ? 'customer' : 'supplier'}&apos;s credit is used up immediately; Liquid Cash only
                    changes once this cheque is marked cleared.
                  </FormDescription>
                </div>
              )}

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="e.g. Credit from sales return SR-0012" {...field} />
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
                  loading={createRefund.isPending}
                  disabled={!counterpartyId || availableCredit === null || noCredit}
                >
                  Record refund
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DuplicateConfirmDialog
        message={duplicate?.message ?? null}
        pending={createRefund.isPending}
        onConfirm={() => duplicate && submit({ ...duplicate.body, confirmDuplicate: true })}
        onCancel={() => setDuplicate(null)}
      />
    </>
  );
}
