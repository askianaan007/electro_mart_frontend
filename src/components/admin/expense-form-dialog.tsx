'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { getErrorMessage } from '@/lib/api/error';
import type { Expense } from '@/lib/api/types';

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.string().refine((v) => Number(v) > 0, 'Enter a valid amount'),
  expenseDate: z.string().min(1, 'Date is required'),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(expense?: Expense): FormValues {
  return {
    description: expense?.description ?? '',
    amount: expense ? String(expense.amount) : '',
    expenseDate: expense?.expenseDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    remarks: expense?.remarks ?? '',
  };
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}) {
  const isEdit = !!expense;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expense?.id ?? '');
  const pending = createExpense.isPending || updateExpense.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(expense),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(expense));
  }, [open, expense, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      description: values.description,
      amount: Number(values.amount),
      expenseDate: values.expenseDate,
      remarks: values.remarks || undefined,
    };

    const mutation = isEdit ? updateExpense : createExpense;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Expense updated' : 'Expense recorded');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit expense' : 'Add expense'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Record an expense'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
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
                      <Input type="number" min={0.01} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseDate"
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
                {isEdit ? 'Save changes' : 'Add expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
