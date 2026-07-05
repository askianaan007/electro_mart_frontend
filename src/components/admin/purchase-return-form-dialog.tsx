'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePurchaseReturn } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import type { Purchase } from '@/lib/api/types';

const schema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  returnDate: z.string().min(1, 'Date is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Select a product'),
        quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
      }),
    )
    .min(1, 'Add at least one item'),
});

type FormValues = z.infer<typeof schema>;

export function PurchaseReturnFormDialog({
  open,
  onOpenChange,
  purchase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
}) {
  const createPurchaseReturn = useCreatePurchaseReturn();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      returnDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: '', quantity: '1' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  useEffect(() => {
    if (open) {
      form.reset({
        reason: '',
        returnDate: new Date().toISOString().slice(0, 10),
        items: [{ productId: purchase?.items[0]?.productId ?? '', quantity: '1' }],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, purchase?.id]);

  const onSubmit = form.handleSubmit((values) => {
    if (!purchase) return;
    createPurchaseReturn.mutate(
      {
        purchaseId: purchase.id,
        reason: values.reason,
        returnDate: values.returnDate,
        items: values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      },
      {
        onSuccess: () => {
          toast.success('Purchase return recorded — stock updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record purchase return" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Return items to {purchase?.supplier.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-3">
              {fields.map((rowField, index) => (
                <div key={rowField.id} className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Product</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {purchase?.items.map((item) => (
                              <SelectItem key={item.productId} value={item.productId}>
                                {item.product?.name ?? item.productId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} className="w-24" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '1' })}
              >
                <Plus />
                Add Item
              </Button>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Damaged, wrong item, defective..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="returnDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createPurchaseReturn.isPending}>
                Record return
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
