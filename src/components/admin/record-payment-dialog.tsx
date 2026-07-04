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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePayment } from '@/hooks/use-payments';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/lib/api/types';

const schema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, 'Enter a valid amount'),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  reference: z.string(),
  paymentDate: z.string().min(1, 'Payment date is required'),
});

type FormValues = z.infer<typeof schema>;

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}) {
  const createPayment = useCreatePayment();
  const alreadyPaid = (invoice?.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = invoice ? Number(invoice.grandTotal) - alreadyPaid : 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      mode: 'CASH',
      reference: '',
      paymentDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: remaining > 0 ? String(remaining) : '',
        mode: 'CASH',
        reference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id]);

  const onSubmit = form.handleSubmit((values) => {
    if (!invoice) return;
    createPayment.mutate(
      {
        invoiceId: invoice.id,
        amount: Number(values.amount),
        mode: values.mode,
        reference: values.reference || undefined,
        paymentDate: values.paymentDate,
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record payment">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
        </DialogHeader>
        {invoice && (
          <p className="-mt-2 text-sm text-muted-foreground">
            Invoice {invoice.invoiceNumber} &middot; Remaining balance: {formatCurrency(Math.max(remaining, 0))}
          </p>
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
            <div className="grid grid-cols-2 gap-4">
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
                      <Input type="date" {...field} />
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
                  <FormLabel>Reference / Cheque number (optional)</FormLabel>
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
              <Button type="submit" loading={createPayment.isPending}>
                Save payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
