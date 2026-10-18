'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertCircle, Calendar, Check, ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
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
    return <span className="font-medium tabular-nums text-foreground">{formatCurrency(gross)}</span>;
  }

  const discount = lineDiscountAmount(gross, discountType, discountValue);
  if (discount <= 0) {
    return <span className="font-medium tabular-nums text-foreground">{formatCurrency(gross)}</span>;
  }
  const net = Math.max(gross - discount, 0);
  return (
    <div className="flex flex-col items-end gap-0.5 tabular-nums">
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(gross)}</span>
      <span className="font-medium text-success">{formatCurrency(net)}</span>
    </div>
  );
}

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

  const filtered = dealers.filter(
    (dealer) =>
      dealer.businessName.toLowerCase().includes(search.trim().toLowerCase()) ||
      (dealer.ownerName && dealer.ownerName.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const selected = dealers.find((dealer) => dealer.id === value);

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setSearch('');
          setOpen((o) => !o);
        }}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:bg-transparent"
      >
        {selected ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="min-w-0 text-left">
              <p className="truncate font-medium text-foreground">{selected.businessName}</p>
            </div>
            {selected.ownerName && (
              <span className="min-w-0 shrink-[2] truncate text-xs text-muted-foreground">{selected.ownerName}</span>
            )}
          </div>
        ) : (
          <span className="truncate text-muted-foreground">Select a dealer for this order...</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[100] mt-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="relative p-1">
            <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search dealer by business or owner name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <div className="mt-1 max-h-60 space-y-0.5 overflow-y-auto p-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">No dealers found</p>
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
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted',
                    dealer.id === value && 'bg-accent text-accent-foreground',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{dealer.businessName}</p>
                    {dealer.ownerName && <div className="truncate text-xs text-muted-foreground">{dealer.ownerName}</div>}
                  </div>
                  {dealer.id === value && <Check className="size-4 shrink-0 text-primary" />}
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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Discount mode</p>
        <p className="text-xs text-muted-foreground">
          {value === 'ORDER'
            ? 'One overall discount calculated across the entire order total'
            : 'Discount individual product lines — remaining items stay at wholesale rate'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card p-0.5 text-[13px]">
        <button
          type="button"
          onClick={() => onChange('ORDER')}
          className={cn(
            'rounded px-3 py-1 font-medium transition-colors',
            value === 'ORDER' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Order-wide
        </button>
        <button
          type="button"
          onClick={() => onChange('PRODUCT')}
          className={cn(
            'rounded px-3 py-1 font-medium transition-colors',
            value === 'PRODUCT' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={isEdit ? `Edit Order #${order.orderNumber}` : 'New Order'}
        description={
          isEdit
            ? 'Modify line items, quantities, or order-wide discounts for this existing order record.'
            : 'Build a new dealer order with real-time stock availability and custom discount structures.'
        }
        onBack={() => router.back()}
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Section 1: Dealer & sale mode */}
          <Card className="relative z-30">
            <CardHeader className="pb-4">
              <CardTitle>Customer &amp; order type</CardTitle>
              <CardDescription>Who the order is for and how it should be recorded.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="dealerId"
                  render={({ field }) => (
                    <FormItem className="min-w-0 sm:col-span-1">
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
                      <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:col-span-2">
                        <div className="min-w-0 space-y-0.5">
                          <FormLabel className="cursor-pointer text-sm font-medium">
                            Record as already-completed sale
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Off: order is created in Approved state for later fulfilment. On: instantly complete the
                            sale &amp; update the dealer balance.
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
                        <FormLabel>Sale date (backdated)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              className="h-10 pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Line items */}
          <Card className="relative z-20 overflow-hidden">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-4">
              <div className="space-y-1">
                <CardTitle>Line items ({fields.length})</CardTitle>
                <CardDescription>Products, quantities and optional per-line discounts.</CardDescription>
              </div>
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

            <CardContent className="pb-4 sm:pb-4">
              <DiscountModeToggle value={discountMode} onChange={setDiscountMode} />
            </CardContent>

            {/* Desktop items table */}
            <div className="hidden border-t border-border sm:block">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-5/12">Product</TableHead>
                    <TableHead className="w-28">Quantity</TableHead>
                    <TableHead className="w-28 text-right">Wholesale Rate</TableHead>
                    {discountMode === 'PRODUCT' && <TableHead className="w-44">Discount</TableHead>}
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((rowField, index) => {
                    const selectedProd = products?.data.find((p) => p.id === watchedItems[index]?.productId);
                    const reqQty = Number(watchedItems[index]?.quantity) || 0;
                    const stockWarning = selectedProd && reqQty > selectedProd.currentStock;

                    return (
                      <TableRow key={rowField.id} className="align-top">
                        <TableCell className="whitespace-normal">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select product..." />
                                </SelectTrigger>
                                <SelectContent searchable searchPlaceholder="Search products…">
                                  {products?.data.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      <span>{product.name}</span>
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        ({product.currentStock} in stock)
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {stockWarning && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                              <AlertCircle className="size-3 shrink-0" />
                              <span>
                                Requested qty ({reqQty}) exceeds available stock ({selectedProd.currentStock})
                              </span>
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <Input type="number" min={1} className="w-24 text-center tabular-nums" {...field} />
                            )}
                          />
                        </TableCell>

                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(unitPrice(products?.data, watchedItems[index]?.productId))}
                        </TableCell>

                        {discountMode === 'PRODUCT' && (
                          <TableCell>
                            <div className="flex items-start gap-1.5">
                              <FormField
                                control={form.control}
                                name={`items.${index}.discountType`}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-16 px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PERCENTAGE">%</SelectItem>
                                      <SelectItem value="FIXED">$</SelectItem>
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
                                        className="w-20 tabular-nums"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TableCell>
                        )}

                        <TableCell className="text-right">
                          <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
                        </TableCell>

                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove line item"
                            disabled={fields.length === 1}
                            onClick={() => remove(index)}
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile item cards */}
            <div className="space-y-3 px-4 pb-4 sm:hidden">
              {fields.map((rowField, index) => {
                const selectedProd = products?.data.find((p) => p.id === watchedItems[index]?.productId);
                const reqQty = Number(watchedItems[index]?.quantity) || 0;
                const stockWarning = selectedProd && reqQty > selectedProd.currentStock;

                return (
                  <div key={rowField.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove line item"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel>Product</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Select product..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent searchable searchPlaceholder="Search products…">
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

                    {stockWarning && (
                      <p className="flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                        <AlertCircle className="size-3 shrink-0" />
                        <span>
                          Qty ({reqQty}) exceeds stock ({selectedProd.currentStock})
                        </span>
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} className="tabular-nums" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Wholesale rate</p>
                        <p className="flex h-9 items-center text-sm font-medium tabular-nums text-foreground">
                          {formatCurrency(unitPrice(products?.data, watchedItems[index]?.productId))}
                        </p>
                      </div>
                    </div>

                    {discountMode === 'PRODUCT' && (
                      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.discountType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                  <SelectItem value="FIXED">Fixed ($)</SelectItem>
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
                                <Input type="number" min={0} step="0.01" placeholder="0" className="tabular-nums" {...field} />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                      <span className="text-muted-foreground">Line total</span>
                      <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Section 3: Discount, summary & actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Summary</CardTitle>
              <CardDescription>Order-level discount and the final total.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="w-full space-y-2 sm:max-w-xs">
                  {discountMode === 'ORDER' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order discount type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
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
                            <FormLabel>{discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount $'}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={discountType === 'PERCENTAGE' ? 100 : undefined}
                                step="0.01"
                                placeholder="0"
                                className="tabular-nums"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      Per-product discount active. Set individual discounts in the table above.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 sm:w-80">
                  <dl className="w-full space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Gross subtotal</dt>
                      <dd className="font-medium tabular-nums text-foreground">{formatCurrency(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Total discount</dt>
                      <dd className="font-medium tabular-nums text-destructive">
                        −{formatCurrency(discountAmountTotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                      <dt>Net order total</dt>
                      <dd className="tabular-nums">{formatCurrency(grandTotal)}</dd>
                    </div>
                  </dl>

                  <div className="flex w-full items-center gap-2 sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
                      Cancel
                    </Button>
                    <Button type="submit" loading={pending} className="flex-1 sm:flex-none">
                      {isEdit ? 'Save Order Changes' : 'Create Order'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
