'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllInvestors } from '@/hooks/use-investors';
import { useCreateInvestment, useUpdateInvestment } from '@/hooks/use-investments';
import { getErrorMessage } from '@/lib/api/error';
import type { Investment } from '@/lib/api/types';

const schema = z.object({
  investorId: z.string().min(1, 'Select an investor'),
  amount: z.string().refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) !== 0, 'Enter a non-zero amount'),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  investmentDate: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Reason is required'),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(investment?: Investment): FormValues {
  return {
    investorId: investment?.investorId ?? '',
    amount: investment ? String(investment.amount) : '',
    mode: investment?.mode ?? 'CASH',
    investmentDate: investment?.investmentDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    reason: investment?.reason ?? '',
    remarks: investment?.remarks ?? '',
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

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      investorId: values.investorId,
      amount: Number(values.amount),
      mode: values.mode,
      investmentDate: values.investmentDate,
      reason: values.reason,
      remarks: values.remarks || undefined,
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
                    <SelectContent>
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
                      <Input type="number" step="0.01" {...field} />
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
                      <Input type="date" {...field} />
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
