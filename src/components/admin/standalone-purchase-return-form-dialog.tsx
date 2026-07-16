'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllSuppliers } from '@/hooks/use-suppliers';
import { useProducts } from '@/hooks/use-products';
import { useCreatePurchaseReturn } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
  unitCost: z.string().refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Invalid cost'),
  reason: z.string().min(1, 'Reason is required'),
  returnDate: z.string().min(1, 'Date is required'),
});

type FormValues = z.infer<typeof schema>;

function defaultValues(supplierId?: string): FormValues {
  return {
    supplierId: supplierId ?? '',
    productId: '',
    quantity: '1',
    unitCost: '0',
    reason: '',
    returnDate: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Records a purchase return that isn't tied to a specific purchase invoice —
 * e.g. a damaged unit found in stock. Reduces stock and the supplier's
 * outstanding credit balance directly, without needing to pick a bill.
 */
export function StandalonePurchaseReturnFormDialog({
  open,
  onOpenChange,
  supplierId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
}) {
  const { data: suppliers } = useAllSuppliers();
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const createPurchaseReturn = useCreatePurchaseReturn();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(supplierId),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(supplierId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplierId]);

  function handleProductSelect(productId: string) {
    form.setValue('productId', productId);
    const product = products?.data.find((p) => p.id === productId);
    if (product) {
      form.setValue('unitCost', String(product.costPrice ?? 0));
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    createPurchaseReturn.mutate(
      {
        supplierId: values.supplierId,
        reason: values.reason,
        returnDate: values.returnDate,
        items: [
          {
            productId: values.productId,
            quantity: Number(values.quantity),
            unitCost: Number(values.unitCost),
          },
        ],
      },
      {
        onSuccess: () => {
          toast.success('Return recorded — stock and supplier balance updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Record a return" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record a return</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">
          For damaged or defective stock that doesn&apos;t need to be matched against a particular purchase bill.
        </p>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!supplierId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.data.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Product</FormLabel>
                    <Select value={field.value} onValueChange={handleProductSelect}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.data.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit cost</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Damaged, defective on arrival..." {...field} />
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
