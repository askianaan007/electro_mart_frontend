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
import { useCreateProfitEntry, useUpdateProfitEntry } from '@/hooks/use-profit-entries';
import { getErrorMessage } from '@/lib/api/error';
import type { ProfitEntry } from '@/lib/api/types';

const schema = z.object({
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
  amount: z.string().refine((v) => Number(v) > 0, 'Enter a valid amount'),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(entry?: ProfitEntry): FormValues {
  return {
    periodStart: entry?.periodStart.slice(0, 10) ?? '',
    periodEnd: entry?.periodEnd.slice(0, 10) ?? '',
    amount: entry ? String(entry.amount) : '',
    remarks: entry?.remarks ?? '',
  };
}

export function ProfitEntryFormDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: ProfitEntry;
}) {
  const isEdit = !!entry;
  const createEntry = useCreateProfitEntry();
  const updateEntry = useUpdateProfitEntry(entry?.id ?? '');
  const pending = createEntry.isPending || updateEntry.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(entry),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(entry));
  }, [open, entry, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      periodStart: values.periodStart,
      periodEnd: values.periodEnd,
      amount: Number(values.amount),
      remarks: values.remarks || undefined,
    };

    const mutation = isEdit ? updateEntry : createEntry;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Profit entry updated' : 'Profit entry recorded');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit profit entry' : 'Add profit entry'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit profit entry' : 'Record a profit-period entry'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period end</FormLabel>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profit amount</FormLabel>
                  <FormControl>
                    <Input type="number" min={0.01} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
