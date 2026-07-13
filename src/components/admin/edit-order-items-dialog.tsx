'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProducts } from '@/hooks/use-products';
import { useUpdateOrderItems } from '@/hooks/use-orders';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Order, Product } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
});

const schema = z.object({
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

type FormValues = z.infer<typeof schema>;

function unitPrice(products: Product[] | undefined, productId: string | undefined) {
  return Number(products?.find((p) => p.id === productId)?.wholesalePrice ?? 0);
}

export function EditOrderItemsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
}) {
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const updateOrderItems = useUpdateOrderItems();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: order.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        items: order.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })),
      });
    }
  }, [open, order, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });

  const grandTotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * unitPrice(products?.data, item.productId),
    0,
  );

  const onSubmit = form.handleSubmit((values) => {
    updateOrderItems.mutate(
      {
        id: order.id,
        items: values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      },
      {
        onSuccess: () => {
          toast.success('Order items updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Edit order items" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit order items</DialogTitle>
          <DialogDescription>
            Only available while this order is pending approval. Totals recompute from current pricing.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex justify-end">
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5">Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Line Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((rowField, index) => (
                  <TableRow key={rowField.id}>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.data.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.currentStock} in stock)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => <Input type="number" min={1} className="w-20" {...field} />}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(
                        (Number(watchedItems[index]?.quantity) || 0) *
                          unitPrice(products?.data, watchedItems[index]?.productId),
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end border-t border-border pt-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-lg font-semibold">{formatCurrency(grandTotal)}</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateOrderItems.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
