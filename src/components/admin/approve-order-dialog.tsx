'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApproveOrder } from '@/hooks/use-orders';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

const schema = z
  .object({
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.discountValue.trim() === '') return;
    const num = Number(data.discountValue);
    if (Number.isNaN(num) || num < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Enter a valid amount' });
      return;
    }
    if (data.discountType === 'PERCENTAGE' && num > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Percentage cannot exceed 100' });
    }
  });

type FormValues = z.infer<typeof schema>;

export function ApproveOrderDialog({
  open,
  onOpenChange,
  orderId,
  subtotal,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  subtotal: string;
  onApproved?: () => void;
}) {
  const approveOrder = useApproveOrder();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { discountType: 'PERCENTAGE', discountValue: '' },
  });

  useEffect(() => {
    if (open) form.reset({ discountType: 'PERCENTAGE', discountValue: '' });
  }, [open, form]);

  const discountType = form.watch('discountType');
  const discountValue = Number(form.watch('discountValue')) || 0;
  const subtotalNum = Number(subtotal);
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotalNum * discountValue) / 100 : discountValue;
  const finalTotal = Math.max(subtotalNum - discountAmount, 0);

  const onSubmit = form.handleSubmit((values) => {
    const value = values.discountValue.trim() === '' ? 0 : Number(values.discountValue);

    if (values.discountType === 'FIXED' && value > subtotalNum) {
      form.setError('discountValue', { message: 'Cannot exceed the order subtotal' });
      return;
    }

    approveOrder.mutate(
      {
        id: orderId,
        discountPercentage: values.discountType === 'PERCENTAGE' ? value : undefined,
        discountAmount: values.discountType === 'FIXED' ? value : undefined,
      },
      {
        onSuccess: () => {
          toast.success(value > 0 ? 'Order approved with discount' : 'Order approved — invoice generated');
          form.reset();
          onOpenChange(false);
          onApproved?.();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Approve order">
        <DialogHeader>
          <DialogTitle>Approve this order</DialogTitle>
          <DialogDescription>
            Optionally apply a discount before generating the invoice. The dealer will see the final total.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                        <SelectItem value="FIXED">Fixed amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={discountType === 'PERCENTAGE' ? 100 : undefined}
                        step="0.01"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>Leave blank for no discount</FormDescription>

            <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotalNum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Final total</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" loading={approveOrder.isPending}>
                Approve order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
