'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DuplicateConfirmDialog } from '@/components/admin/duplicate-confirm-dialog';
import { useCreateSettlement } from '@/hooks/use-credits';
import { isPossibleDuplicate } from '@/lib/api/duplicate';
import { getErrorMessage } from '@/lib/api/error';
import { businessToday, formatCurrency } from '@/lib/utils';

const schema = z.object({
  // Mirrors the backend: > 0, at most 2 decimals, ≤ 1,000,000,000.
  amount: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0, 'Enter a valid amount (up to 2 decimals)')
    .refine((v) => Number(v) <= 1_000_000_000, 'Amount cannot exceed 1,000,000,000'),
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  reference: z.string(),
  // The payment date can't be in the future; the cheque deposit date can.
  paymentDate: z
    .string()
    .min(1, 'Date is required')
    .refine((v) => v <= businessToday(), 'Payment date cannot be in the future'),
  chequeDepositDate: z.string(),
  bankName: z.string().max(80, 'Keep the bank name under 80 characters'),
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
  type SettlementBody = Parameters<typeof createSettlement.mutate>[0];
  // Set when the backend flags the settlement as a POSSIBLE_DUPLICATE: the
  // exact body that was refused, resent with confirmDuplicate only on confirm.
  const [duplicate, setDuplicate] = useState<{ message: string; body: SettlementBody } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      mode: 'CASH',
      reference: '',
      paymentDate: businessToday(),
      chequeDepositDate: '',
      bankName: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (open) {
      setDuplicate(null);
      form.reset({
        amount: '',
        mode: 'CASH',
        reference: '',
        paymentDate: businessToday(),
        chequeDepositDate: '',
        bankName: '',
        remarks: '',
      });
    }
  }, [open, form]);

  const mode = form.watch('mode');

  function submit(body: SettlementBody) {
    createSettlement.mutate(body, {
      onSuccess: () => {
        setDuplicate(null);
        toast.success(body.mode === 'CHEQUE' ? 'Cheque recorded — pending until it clears' : 'Settlement recorded');
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
    if (values.mode === 'CHEQUE') {
      // Cheque Flow lists this cheque by its number and bank.
      let missing = false;
      if (!values.reference.trim()) {
        form.setError('reference', { message: 'Cheque number is required' });
        missing = true;
      }
      if (!values.bankName.trim()) {
        form.setError('bankName', { message: 'Bank is required for cheque settlements' });
        missing = true;
      }
      if (!values.chequeDepositDate) {
        form.setError('chequeDepositDate', { message: 'Deposit date is required for cheque settlements' });
        missing = true;
      }
      if (missing) return;
    }

    submit({
      amount: Number(values.amount),
      mode: values.mode,
      reference: values.reference || undefined,
      paymentDate: values.paymentDate,
      chequeDepositDate: values.mode === 'CHEQUE' ? values.chequeDepositDate : undefined,
      bankName: values.mode === 'CHEQUE' ? values.bankName.trim() : undefined,
      remarks: values.remarks || undefined,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record settlement">
        <DialogHeader>
          <DialogTitle>Settle credit with {supplierName}</DialogTitle>
          <DialogDescription>Record a payment against this supplier&apos;s outstanding credit.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Outstanding credit balance</span>
          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(creditBalance)}</span>
        </div>
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
                      <Input type="date" max={businessToday()} {...field} />
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
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Sampath" maxLength={80} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
        <DuplicateConfirmDialog
          message={duplicate?.message ?? null}
          pending={createSettlement.isPending}
          onCancel={() => setDuplicate(null)}
          onConfirm={() => duplicate && submit({ ...duplicate.body, confirmDuplicate: true })}
        />
      </DialogContent>
    </Dialog>
  );
}
