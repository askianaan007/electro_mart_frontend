'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllDealers } from '@/hooks/use-dealers';
import { useProducts } from '@/hooks/use-products';
import { useCreateOrder } from '@/hooks/use-orders';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
});

const schema = z
  .object({
    dealerId: z.string().min(1, 'Select a dealer'),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
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

function unitPrice(products: Product[] | undefined, productId: string | undefined) {
  return Number(products?.find((p) => p.id === productId)?.wholesalePrice ?? 0);
}

function LineTotal({
  control,
  index,
  products,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  index: number;
  products: Product[] | undefined;
}) {
  const productId = useWatch({ control, name: `items.${index}.productId` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const total = (Number(quantity) || 0) * unitPrice(products, productId);
  return <span className="font-medium">{formatCurrency(total)}</span>;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { data: dealers } = useAllDealers();
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const createOrder = useCreateOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dealerId: '',
      items: [{ productId: '', quantity: '1' }],
      discountType: 'PERCENTAGE',
      discountValue: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const discountType = form.watch('discountType');
  const discountValue = Number(form.watch('discountValue')) || 0;

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * unitPrice(products?.data, item.productId),
    0,
  );
  const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discountValue) / 100 : discountValue;
  const grandTotal = Math.max(subtotal - discountAmount, 0);

  const onSubmit = form.handleSubmit((values) => {
    const value = values.discountValue.trim() === '' ? 0 : Number(values.discountValue);

    if (values.discountType === 'FIXED' && value > subtotal) {
      form.setError('discountValue', { message: 'Cannot exceed the order subtotal' });
      return;
    }

    createOrder.mutate(
      {
        dealerId: values.dealerId,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
        discountPercentage: values.discountType === 'PERCENTAGE' ? value : undefined,
        discountAmount: values.discountType === 'FIXED' ? value : undefined,
      },
      {
        onSuccess: (order) => {
          toast.success(
            value > 0
              ? 'Order created and approved with discount — stock reserved, invoice generated'
              : 'Order created and approved — stock reserved, invoice generated',
          );
          router.push(`/admin/orders/${order.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">New order</h1>
        <p className="text-sm text-muted-foreground">
          Orders created here are approved immediately — stock is reserved and an invoice is generated right away.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dealer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="dealerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dealer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dealers?.data.map((dealer) => (
                          <SelectItem key={dealer.id} value={dealer.id}>
                            {dealer.businessName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Line items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '1' })}
              >
                <Plus />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/5">Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
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
                            render={({ field }) => <Input type="number" min={1} className="w-24" {...field} />}
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(unitPrice(products?.data, watchedItems[index]?.productId))}
                        </TableCell>
                        <TableCell>
                          <LineTotal control={form.control} index={index} products={products?.data} />
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
              </div>

              <div className="space-y-4 sm:hidden">
                {fields.map((rowField, index) => (
                  <div key={rowField.id} className="space-y-3 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item {index + 1}</span>
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
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products?.data.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.currentStock} in stock)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Line total</span>
                      <LineTotal control={form.control} index={index} products={products?.data} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:w-64">
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

                <div className="w-full space-y-1 sm:w-64">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>−{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                    <span>Order Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={createOrder.isPending}>
              Create Order
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
