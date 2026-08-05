'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePaySettlement } from '@/hooks/use-commission';
import { getErrorMessage } from '@/lib/api/error';
import type { PaymentMode } from '@/lib/api/types';

const schema = z.object({
  mode: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER']),
  reference: z.string(),
  chequeNumber: z.string(),
  bankName: z.string(),
  chequeDate: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function PaySettlementDialog({
  open,
  onOpenChange,
  settlementId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementId: string;
}) {
  const paySettlement = usePaySettlement(settlementId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'CASH', reference: '', chequeNumber: '', bankName: '', chequeDate: '' },
  });

  useEffect(() => {
    if (open) form.reset({ mode: 'CASH', reference: '', chequeNumber: '', bankName: '', chequeDate: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mode = useWatch({ control: form.control, name: 'mode' });

  const onSubmit = form.handleSubmit((values) => {
    if (values.mode === 'CHEQUE' && (!values.chequeNumber || !values.bankName || !values.chequeDate)) {
      if (!values.chequeNumber) form.setError('chequeNumber', { message: 'Required for cheque payments' });
      if (!values.bankName) form.setError('bankName', { message: 'Required for cheque payments' });
      if (!values.chequeDate) form.setError('chequeDate', { message: 'Required for cheque payments' });
      return;
    }

    const payload: { mode: PaymentMode; reference?: string; chequeNumber?: string; bankName?: string; chequeDate?: string } = {
      mode: values.mode,
      reference: values.reference || undefined,
      chequeNumber: values.mode === 'CHEQUE' ? values.chequeNumber : undefined,
      bankName: values.mode === 'CHEQUE' ? values.bankName : undefined,
      chequeDate: values.mode === 'CHEQUE' ? values.chequeDate : undefined,
    };

    paySettlement.mutate(payload, {
      onSuccess: () => {
        toast.success('Settlement payment recorded');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record settlement payment">
        <DialogHeader>
          <DialogTitle>Record settlement payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
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
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {mode === 'CHEQUE' ? (
              <div className="grid gap-4 sm:grid-cols-2">
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
            ) : (
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
            )}

            {mode === 'CHEQUE' && (
              <p className="text-xs text-muted-foreground">
                The commission expense is recorded once this cheque is marked cleared, not immediately.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={paySettlement.isPending}>
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
