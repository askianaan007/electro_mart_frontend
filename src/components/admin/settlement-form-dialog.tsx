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
import { useCreateSettlement } from '@/hooks/use-credits';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, 'Enter a valid amount'),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  reference: z.string(),
  paymentDate: z.string().min(1, 'Date is required'),
  chequeDepositDate: z.string(),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function SettlementFormDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  creditBalance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  creditBalance: string;
}) {
  const createSettlement = useCreateSettlement(supplierId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      mode: 'CASH',
      reference: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      chequeDepositDate: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: '',
        mode: 'CASH',
        reference: '',
        paymentDate: new Date().toISOString().slice(0, 10),
        chequeDepositDate: '',
        remarks: '',
      });
    }
  }, [open, form]);

  const mode = form.watch('mode');

  const onSubmit = form.handleSubmit((values) => {
    if (values.mode === 'CHEQUE' && !values.chequeDepositDate) {
      form.setError('chequeDepositDate', { message: 'Deposit date is required for cheque settlements' });
      return;
    }

    createSettlement.mutate(
      {
        amount: Number(values.amount),
        mode: values.mode,
        reference: values.reference || undefined,
        paymentDate: values.paymentDate,
        chequeDepositDate: values.mode === 'CHEQUE' ? values.chequeDepositDate : undefined,
        remarks: values.remarks || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            values.mode === 'CHEQUE' ? 'Cheque recorded — pending until it clears' : 'Settlement recorded',
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record settlement">
        <DialogHeader>
          <DialogTitle>Settle credit with {supplierName}</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">Outstanding credit balance: {formatCurrency(creditBalance)}</p>
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
                      <Input type="number" min={0.01} step="0.01" {...field} />
                    </FormControl>
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
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{mode === 'CHEQUE' ? 'Cheque number' : 'Reference (optional)'}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mode === 'CHEQUE' && (
              <FormField
                control={form.control}
                name="chequeDepositDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque deposit date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      The credit balance drops immediately; it only reverses if this cheque later bounces.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" loading={createSettlement.isPending}>
                Record settlement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
