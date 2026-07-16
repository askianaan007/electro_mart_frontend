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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useProducts } from '@/hooks/use-products';
import { useCreateOrder, useUpdateOrder } from '@/hooks/use-orders';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Order, Product } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
});

const schema = z
  .object({
    dealerId: z.string().min(1, 'Select a dealer'),
    recordAsCompleted: z.boolean(),
    saleDate: z.string(),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.recordAsCompleted) {
      if (!data.saleDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['saleDate'], message: 'Sale date is required' });
      } else if (data.saleDate > new Date().toISOString().slice(0, 10)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['saleDate'], message: 'Sale date cannot be in the future' });
      }
    }
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

function defaultValuesFor(order?: Order): FormValues {
  if (!order) {
    return {
      dealerId: '',
      recordAsCompleted: false,
      saleDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: '', quantity: '1' }],
      discountType: 'PERCENTAGE',
      discountValue: '',
    };
  }
  return {
    dealerId: order.dealerId,
    recordAsCompleted: true,
    saleDate: (order.completedAt ?? order.approvedAt ?? order.createdAt).slice(0, 10),
    items: order.items.map((item) => ({ productId: item.productId, quantity: String(item.quantity) })),
    discountType: 'FIXED',
    discountValue: Number(order.discount) > 0 ? String(order.discount) : '',
  };
}

export function OrderForm({ order }: { order?: Order }) {
  const isEdit = !!order;
  const router = useRouter();
  const { data: dealers } = useAllCustomer();
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(order?.id ?? '');
  const pending = createOrder.isPending || updateOrder.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(order),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const discountType = form.watch('discountType');
  const discountValue = Number(form.watch('discountValue')) || 0;
  const recordAsCompleted = form.watch('recordAsCompleted');

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

    const items = values.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));
    const discountPercentage = values.discountType === 'PERCENTAGE' ? value : undefined;
    const discountAmount = values.discountType === 'FIXED' ? value : undefined;

    if (isEdit) {
      updateOrder.mutate(
        { dealerId: values.dealerId, saleDate: values.saleDate, items, discountPercentage, discountAmount },
        {
          onSuccess: (updated) => {
            toast.success('Order updated — stock and dealer balance reconciled');
            router.push(`/admin/orders/${updated.id}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    } else {
      createOrder.mutate(
        {
          dealerId: values.dealerId,
          saleDate: values.recordAsCompleted ? values.saleDate : undefined,
          items,
          discountPercentage,
          discountAmount,
        },
        {
          onSuccess: (created) => {
            toast.success(
              values.recordAsCompleted
                ? value > 0
                  ? 'Order recorded as completed with discount — stock reserved, invoice generated'
                  : 'Order recorded as completed — stock reserved, invoice generated'
                : "Order created and approved — use Mark as Completed on the order when it's fulfilled",
            );
            router.push(`/admin/orders/${created.id}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    }
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? `Edit ${order.orderNumber}` : 'New order'}</h1>
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Corrects a mistake in this admin-recorded order — stock and the dealer's balance are reconciled to match the changes."
            : recordAsCompleted
              ? "Recorded as a completed sale on the date you choose — stock is reserved, an invoice is generated, and the dealer's balance is updated immediately."
              : "Created pre-approved for this dealer — stock is reserved and an invoice is generated, but it stays open until you mark it as completed from the order page."}
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

              {!isEdit && (
                <FormField
                  control={form.control}
                  name="recordAsCompleted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-2 rounded-lg border border-border p-3 sm:col-span-2">
                      <div>
                        <FormLabel>Record as an already-completed sale</FormLabel>
                        <FormDescription>
                          Off: order is created pre-approved and completed manually later. On: instantly completed
                          on the date you pick.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {(isEdit || recordAsCompleted) && (
                <FormField
                  control={form.control}
                  name="saleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale date</FormLabel>
                      <FormControl>
                        <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
            <Button type="submit" loading={pending}>
              {isEdit ? 'Save changes' : 'Create Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
