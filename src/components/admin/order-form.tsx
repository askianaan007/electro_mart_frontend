'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown, Plus, Trash2 } from 'lucide-react';
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
import { cn, formatCurrency } from '@/lib/utils';
import type { Dealer, Order, Product } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.string(),
});

const schema = z
  .object({
    dealerId: z.string().min(1, 'Select a dealer'),
    recordAsCompleted: z.boolean(),
    saleDate: z.string(),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
    // An order uses either one discount across the whole order, or a
    // separate discount per product — never both at once.
    discountMode: z.enum(['ORDER', 'PRODUCT']),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.recordAsCompleted && data.saleDate > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['saleDate'], message: 'Sale date cannot be in the future' });
    }

    if (data.discountMode === 'ORDER') {
      if (data.discountValue.trim() === '') return;
      const num = Number(data.discountValue);
      if (Number.isNaN(num) || num < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Enter a valid amount' });
        return;
      }
      if (data.discountType === 'PERCENTAGE' && num > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Percentage cannot exceed 100' });
      }
      return;
    }

    data.items.forEach((item, index) => {
      if (item.discountValue.trim() === '') return;
      const num = Number(item.discountValue);
      if (Number.isNaN(num) || num < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discountValue'],
          message: 'Enter a valid amount',
        });
        return;
      }
      if (item.discountType === 'PERCENTAGE' && num > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'discountValue'],
          message: 'Percentage cannot exceed 100',
        });
      }
    });
  });

type FormValues = z.infer<typeof schema>;

function unitPrice(products: Product[] | undefined, productId: string | undefined) {
  return Number(products?.find((p) => p.id === productId)?.wholesalePrice ?? 0);
}

function lineDiscountAmount(lineTotal: number, discountType: 'PERCENTAGE' | 'FIXED', discountValue: string) {
  const value = Number(discountValue) || 0;
  if (value <= 0) return 0;
  return discountType === 'PERCENTAGE' ? (lineTotal * value) / 100 : Math.min(value, lineTotal);
}

function LineTotal({
  control,
  index,
  products,
  discountMode,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  index: number;
  products: Product[] | undefined;
  discountMode: 'ORDER' | 'PRODUCT';
}) {
  const productId = useWatch({ control, name: `items.${index}.productId` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const discountType = useWatch({ control, name: `items.${index}.discountType` });
  const discountValue = useWatch({ control, name: `items.${index}.discountValue` });
  const gross = (Number(quantity) || 0) * unitPrice(products, productId);

  if (discountMode !== 'PRODUCT') {
    return <span className="font-medium">{formatCurrency(gross)}</span>;
  }

  const discount = lineDiscountAmount(gross, discountType, discountValue);
  if (discount <= 0) {
    return <span className="font-medium">{formatCurrency(gross)}</span>;
  }
  const net = Math.max(gross - discount, 0);
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(gross)}</span>
      <span className="font-medium">{formatCurrency(net)}</span>
    </div>
  );
}

/**
 * Existing orders don't store which discount mode was used — figure it out
 * from the numbers. If every line's stored allocatedDiscount matches what
 * proportionally splitting the order's total discount by lineTotal share
 * would produce, it was an order-wide discount; otherwise it must have been
 * entered per product.
 */
function detectDiscountMode(order: Order): 'ORDER' | 'PRODUCT' {
  const totalDiscount = Number(order.discount);
  if (totalDiscount <= 0) return 'ORDER';

  const subtotal = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  if (subtotal <= 0) return 'ORDER';

  const ratio = totalDiscount / subtotal;
  const isProportional = order.items.every((item) => {
    const lineTotal = Number(item.lineTotal);
    const expected = Math.round(lineTotal * ratio * 100) / 100;
    return Math.abs(Number(item.allocatedDiscount) - expected) <= 0.02;
  });
  return isProportional ? 'ORDER' : 'PRODUCT';
}

function defaultValuesFor(order?: Order): FormValues {
  if (!order) {
    return {
      dealerId: '',
      recordAsCompleted: false,
      saleDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: '', quantity: '1', discountType: 'PERCENTAGE', discountValue: '' }],
      discountMode: 'ORDER',
      discountType: 'PERCENTAGE',
      discountValue: '',
    };
  }

  const discountMode = detectDiscountMode(order);
  return {
    dealerId: order.dealerId,
    recordAsCompleted: order.status === 'COMPLETED',
    saleDate: (order.completedAt ?? order.approvedAt ?? order.createdAt).slice(0, 10),
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: String(item.quantity),
      discountType: 'FIXED',
      discountValue:
        discountMode === 'PRODUCT' && Number(item.allocatedDiscount) > 0 ? String(item.allocatedDiscount) : '',
    })),
    discountMode,
    discountType: 'FIXED',
    discountValue: discountMode === 'ORDER' && Number(order.discount) > 0 ? String(order.discount) : '',
  };
}

// A plain Radix Select can't host a working search box — Select manages
// roving focus/typeahead across its items aggressively and steals focus
// back from any input placed inside it. This is a fully self-contained
// dropdown instead, so search input focus is never contested.
function DealerCombobox({
  value,
  onChange,
  dealers,
}: {
  value: string;
  onChange: (id: string) => void;
  dealers: Dealer[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const filtered = dealers.filter((dealer) =>
    dealer.businessName.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selected = dealers.find((dealer) => dealer.id === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setSearch('');
          setOpen((o) => !o);
        }}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.businessName : 'Select dealer'}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="p-1.5">
            <Input
              ref={inputRef}
              placeholder="Search dealer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No dealers found</p>
            ) : (
              filtered.map((dealer) => (
                <button
                  key={dealer.id}
                  type="button"
                  onClick={() => {
                    onChange(dealer.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    dealer.id === value && 'bg-accent/60',
                  )}
                >
                  {dealer.businessName}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscountModeToggle({
  value,
  onChange,
}: {
  value: 'ORDER' | 'PRODUCT';
  onChange: (mode: 'ORDER' | 'PRODUCT') => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-medium">Discount mode</p>
        <p className="text-xs text-muted-foreground">
          {value === 'ORDER'
            ? 'One discount applied across the whole order.'
            : 'Discount individual products — the rest stay at full price.'}
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-sm">
        <button
          type="button"
          onClick={() => onChange('ORDER')}
          className={cn(
            'rounded-md px-3 py-1.5 font-medium transition-colors',
            value === 'ORDER' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Order-wide
        </button>
        <button
          type="button"
          onClick={() => onChange('PRODUCT')}
          className={cn(
            'rounded-md px-3 py-1.5 font-medium transition-colors',
            value === 'PRODUCT'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Per-product
        </button>
      </div>
    </div>
  );
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
  const discountMode = form.watch('discountMode');
  const discountType = form.watch('discountType');
  const discountValue = Number(form.watch('discountValue')) || 0;
  const recordAsCompleted = form.watch('recordAsCompleted');

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * unitPrice(products?.data, item.productId),
    0,
  );

  const productDiscountTotal = watchedItems.reduce((sum, item) => {
    const gross = (Number(item.quantity) || 0) * unitPrice(products?.data, item.productId);
    return sum + lineDiscountAmount(gross, item.discountType, item.discountValue);
  }, 0);

  const discountAmountTotal =
    discountMode === 'PRODUCT' ? productDiscountTotal : discountType === 'PERCENTAGE' ? (subtotal * discountValue) / 100 : discountValue;
  const grandTotal = Math.max(subtotal - discountAmountTotal, 0);

  function setDiscountMode(mode: 'ORDER' | 'PRODUCT') {
    if (mode === form.getValues('discountMode')) return;
    form.setValue('discountMode', mode);
    if (mode === 'ORDER') {
      watchedItems.forEach((_, index) => form.setValue(`items.${index}.discountValue`, ''));
    } else {
      form.setValue('discountValue', '');
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    let orderDiscountPercentage: number | undefined;
    let orderDiscountAmount: number | undefined;

    if (values.discountMode === 'ORDER') {
      const value = values.discountValue.trim() === '' ? 0 : Number(values.discountValue);
      if (values.discountType === 'FIXED' && value > subtotal) {
        form.setError('discountValue', { message: 'Cannot exceed the order subtotal' });
        return;
      }
      orderDiscountPercentage = values.discountType === 'PERCENTAGE' ? value : undefined;
      orderDiscountAmount = values.discountType === 'FIXED' ? value : undefined;
    } else {
      for (let i = 0; i < values.items.length; i++) {
        const item = values.items[i];
        if (item.discountType !== 'FIXED') continue;
        const value = item.discountValue.trim() === '' ? 0 : Number(item.discountValue);
        const gross = Number(item.quantity) * unitPrice(products?.data, item.productId);
        if (value > gross) {
          form.setError(`items.${i}.discountValue`, { message: 'Cannot exceed this line total' });
          return;
        }
      }
    }

    const items = values.items.map((item) => {
      const base = { productId: item.productId, quantity: Number(item.quantity) };
      if (values.discountMode !== 'PRODUCT') return base;
      const value = item.discountValue.trim() === '' ? 0 : Number(item.discountValue);
      if (value <= 0) return base;
      return {
        ...base,
        discountPercentage: item.discountType === 'PERCENTAGE' ? value : undefined,
        discountAmount: item.discountType === 'FIXED' ? value : undefined,
      };
    });

    if (isEdit) {
      updateOrder.mutate(
        {
          dealerId: values.dealerId,
          saleDate: values.recordAsCompleted ? values.saleDate : undefined,
          items,
          discountPercentage: orderDiscountPercentage,
          discountAmount: orderDiscountAmount,
        },
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
          discountPercentage: orderDiscountPercentage,
          discountAmount: orderDiscountAmount,
        },
        {
          onSuccess: (created) => {
            toast.success(
              values.recordAsCompleted
                ? discountAmountTotal > 0
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
            ? recordAsCompleted
              ? "Corrects a mistake in this order — stock and the dealer's balance are reconciled to match the changes."
              : "Corrects a mistake in this order's dealer/items/discount — stock is reconciled to match the changes. This order isn't completed yet, so the dealer's balance is untouched."
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
                    <FormControl>
                      <DealerCombobox value={field.value} onChange={field.onChange} dealers={dealers?.data ?? []} />
                    </FormControl>
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

              {recordAsCompleted && (
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
                onClick={() => append({ productId: '', quantity: '1', discountType: 'PERCENTAGE', discountValue: '' })}
              >
                <Plus />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <DiscountModeToggle value={discountMode} onChange={setDiscountMode} />

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/5">Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      {discountMode === 'PRODUCT' && <TableHead>Discount</TableHead>}
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
                        {discountMode === 'PRODUCT' && (
                          <TableCell>
                            <div className="flex gap-1">
                              <FormField
                                control={form.control}
                                name={`items.${index}.discountType`}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-9 w-[4.5rem] px-2 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PERCENTAGE">%</SelectItem>
                                      <SelectItem value="FIXED">Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.discountValue`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={watchedItems[index]?.discountType === 'PERCENTAGE' ? 100 : undefined}
                                        step="0.01"
                                        placeholder="0"
                                        className="h-9 w-20"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
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
                    {discountMode === 'PRODUCT' && (
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.discountType`}
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
                          name={`items.${index}.discountValue`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} step="0.01" placeholder="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Line total</span>
                      <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="grid grid-cols-2 gap-3 sm:w-64">
                  {discountMode === 'ORDER' ? (
                    <>
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
                    </>
                  ) : (
                    <p className="col-span-2 self-end text-sm text-muted-foreground">
                      Set each product&apos;s discount in the table above.
                    </p>
                  )}
                </div>

                <div className="w-full space-y-1 sm:w-64">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>−{formatCurrency(discountAmountTotal)}</span>
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
