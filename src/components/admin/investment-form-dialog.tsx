'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllInvestors } from '@/hooks/use-investors';
import { useCreateInvestment, useUpdateInvestment } from '@/hooks/use-investments';
import { getErrorMessage } from '@/lib/api/error';
import { businessToday } from '@/lib/utils';
import type { Investment } from '@/lib/api/types';

const MAX_AMOUNT = 1_000_000_000;

const schema = z
  .object({
    investorId: z.string().min(1, 'Select an investor'),
    amount: z
      .string()
      .refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) !== 0, 'Enter a non-zero amount')
      .refine((v) => /^-?\d*(\.\d{0,2})?$/.test(v.trim()), 'At most 2 decimal places')
      .refine((v) => Math.abs(Number(v)) <= MAX_AMOUNT, 'Amount cannot exceed 1,000,000,000'),
    mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
    investmentDate: z
      .string()
      .min(1, 'Date is required')
      .refine((v) => v <= businessToday(), 'Date cannot be in the future'),
    reason: z.string().min(1, 'Reason is required'),
    remarks: z.string(),
    chequeNumber: z.string(),
    bankName: z.string(),
    chequeDate: z.string(),
  })
  .superRefine((values, ctx) => {
    // The backend rejects a cheque entry without its cheque details.
    if (values.mode !== 'CHEQUE') return;
    if (!values.chequeNumber.trim()) ctx.addIssue({ code: 'custom', path: ['chequeNumber'], message: 'Required for cheques' });
    if (!values.bankName.trim()) ctx.addIssue({ code: 'custom', path: ['bankName'], message: 'Required for cheques' });
    if (!values.chequeDate) ctx.addIssue({ code: 'custom', path: ['chequeDate'], message: 'Required for cheques' });
  });

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(investment?: Investment): FormValues {
  return {
    investorId: investment?.investorId ?? '',
    amount: investment ? String(investment.amount) : '',
    mode: investment?.mode ?? 'CASH',
    investmentDate: investment?.investmentDate.slice(0, 10) ?? businessToday(),
    reason: investment?.reason ?? '',
    remarks: investment?.remarks ?? '',
    chequeNumber: investment?.chequeNumber ?? '',
    bankName: investment?.bankName ?? '',
    chequeDate: investment?.chequeDate?.slice(0, 10) ?? '',
  };
}

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
}) {
  const isEdit = !!investment;
  const { data: investors } = useAllInvestors();
  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment(investment?.id ?? '');
  const pending = createInvestment.isPending || updateInvestment.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(investment),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(investment));
  }, [open, investment, form]);

  const mode = useWatch({ control: form.control, name: 'mode' });
  const isCheque = mode === 'CHEQUE';
  // Switching an existing non-cheque entry to cheque (or a new cheque) starts it as PENDING.
  const startsPending = isCheque && investment?.mode !== 'CHEQUE';

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      investorId: values.investorId,
      amount: Number(values.amount),
      mode: values.mode,
      investmentDate: values.investmentDate,
      reason: values.reason,
      remarks: values.remarks || undefined,
      chequeNumber: values.mode === 'CHEQUE' ? values.chequeNumber.trim() : undefined,
      bankName: values.mode === 'CHEQUE' ? values.bankName.trim() : undefined,
      chequeDate: values.mode === 'CHEQUE' ? values.chequeDate : undefined,
    };

    const mutation = isEdit ? updateInvestment : createInvestment;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Investment entry updated' : 'Investment entry recorded');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit investment entry' : 'Add investment entry'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit investment entry' : 'Record an investment entry'}</DialogTitle>
          <DialogDescription>Positive amounts are capital contributions; negative amounts are withdrawals.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="investorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent searchable searchPlaceholder="Search investors…">
                      {investors?.data.map((investor) => (
                        <SelectItem key={investor.id} value={investor.id}>
                          {investor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="tabular-nums" {...field} />
                    </FormControl>
                    <FormDescription>Negative for a withdrawal</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="investmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" max={businessToday()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Investment, Transport, withdraw..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {isCheque && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
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
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                <p className="rounded-lg border border-info/20 bg-info/10 p-3 text-xs text-info">
                  {startsPending ? 'This cheque starts as pending. ' : ''}A cheque entry only counts toward Liquid Cash
                  and the investor&apos;s equity once it is marked cleared.
                </p>
              </>
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
                {isEdit ? 'Save changes' : 'Add entry'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
