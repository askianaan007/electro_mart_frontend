'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    return <span className="font-black text-xs sm:text-sm text-foreground">{formatCurrency(gross)}</span>;
  }

  const discount = lineDiscountAmount(gross, discountType, discountValue);
  if (discount <= 0) {
    return <span className="font-black text-xs sm:text-sm text-foreground">{formatCurrency(gross)}</span>;
  }
  const net = Math.max(gross - discount, 0);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(gross)}</span>
      <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(net)}</span>
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setSearch('');
          setOpen((o) => !o);
        }}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs backdrop-blur-md transition-all hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {selected ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-extrabold text-[10px] shrink-0">
              {selected.businessName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 text-left">
              <p className="font-bold text-foreground truncate">{selected.businessName}</p>
              {selected.ownerName && (
                <p className="text-[10px] text-muted-foreground font-medium truncate">{selected.ownerName}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground font-medium">Select a dealer for this order...</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[100] mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-2xl backdrop-blur-2xl">
          <div className="relative p-1">
            <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search dealer by business or owner name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl border-border/60 bg-background/60 pl-9 text-xs"
            />
          </div>
          <div className="mt-1 max-h-60 overflow-y-auto space-y-1 p-1">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs font-semibold text-muted-foreground">No dealers found</p>
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
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60',
                    dealer.id === value && 'bg-primary/10 border border-primary/20 text-primary font-bold'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-7 items-center justify-center rounded-full bg-muted border border-border/60 font-bold text-[10px] text-muted-foreground shrink-0">
                      {dealer.businessName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{dealer.businessName}</p>
                      {dealer.ownerName && <p className="text-[10px] text-muted-foreground">{dealer.ownerName}</p>}
                    </div>
                  </div>
                  {dealer.id === value && <Check className="size-4 text-primary shrink-0" />}
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3.5 backdrop-blur-md">
      <div>
        <p className="text-xs font-extrabold text-foreground">Discount Mode</p>
        <p className="text-[11px] text-muted-foreground font-medium">
          {value === 'ORDER'
            ? 'One overall discount calculated across the entire order total'
            : 'Discount individual product lines — remaining items stay at wholesale rate'}
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1 text-xs shrink-0">
        <button
          type="button"
          onClick={() => onChange('ORDER')}
          className={cn(
            'rounded-lg px-3 py-1.5 font-extrabold transition-all duration-200',
            value === 'ORDER'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Order-wide
        </button>
        <button
          type="button"
          onClick={() => onChange('PRODUCT')}
          className={cn(
            'rounded-lg px-3 py-1.5 font-extrabold transition-all duration-200',
            value === 'PRODUCT'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
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
    <div className="space-y-6 select-none max-w-5xl mx-auto">
      {/* Top Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2 rounded-full font-bold text-xs hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Orders</span>
      </Button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
            <ShoppingBag className="size-5" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {isEdit ? `Edit Order #${order.orderNumber}` : 'Create New Dealer Order'}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground font-medium sm:text-sm">
          {isEdit
            ? 'Modify line items, quantities, or order-wide discounts for this existing order record'
            : 'Build a new dealer order with real-time stock availability and custom discount structures'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Card 1: Dealer & Sale Mode Setup */}
          <div className="relative z-30 rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl overflow-hidden bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Store className="size-4.5 text-primary" />
              <h2 className="text-sm font-extrabold tracking-tight text-foreground uppercase">
                1. Customer &amp; Order Type
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="dealerId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Target Dealer
                    </FormLabel>
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
                    <FormItem className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 p-3.5 sm:col-span-2 backdrop-blur-md shadow-2xs">
                      <div className="space-y-0.5 min-w-0">
                        <FormLabel className="text-xs font-extrabold text-foreground cursor-pointer">
                          Record as Already-Completed Sale
                        </FormLabel>
                        <FormDescription className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                          Off: Order created in Approved state for later fulfillment. On: Instantly complete sale &amp; update dealer balance.
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Backdated Sale Date
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="date"
                            max={new Date().toISOString().slice(0, 10)}
                            className="h-12 rounded-2xl border-border/60 bg-background/60 pl-10 text-xs font-semibold backdrop-blur-md"
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
          </div>

          {/* Card 2: Line Items */}
          <div className="relative z-20 rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Package className="size-4.5 text-primary" />
                <h2 className="text-sm font-extrabold tracking-tight text-foreground uppercase">
                  2. Order Line Items ({fields.length})
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '1', discountType: 'PERCENTAGE', discountValue: '' })}
                className="rounded-2xl font-bold text-xs backdrop-blur-md shadow-xs h-9"
              >
                <Plus className="size-4" />
                <span>Add Item</span>
              </Button>
            </div>

            <DiscountModeToggle value={discountMode} onChange={setDiscountMode} />

            {/* Desktop Items Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table className="min-w-[700px] text-xs">
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="w-5/12 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Product Item
                      </TableHead>
                      <TableHead className="w-28 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Quantity
                      </TableHead>
                      <TableHead className="w-28 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Wholesale Rate
                      </TableHead>
                      {discountMode === 'PRODUCT' && (
                        <TableHead className="w-44 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Discount
                        </TableHead>
                      )}
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Line Total
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {fields.map((rowField, index) => {
                      const selectedProd = products?.data.find((p) => p.id === watchedItems[index]?.productId);
                      const reqQty = Number(watchedItems[index]?.quantity) || 0;
                      const stockWarning = selectedProd && reqQty > selectedProd.currentStock;

                      return (
                        <TableRow key={rowField.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60 text-xs font-semibold">
                                    <SelectValue placeholder="Select product item..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                                    {products?.data.map((product) => (
                                      <SelectItem key={product.id} value={product.id} className="text-xs">
                                        <span>{product.name}</span>
                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                          ({product.currentStock} in stock)
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {stockWarning && (
                              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                <AlertCircle className="size-3 shrink-0" />
                                <span>Requested qty ({reqQty}) exceeds available stock ({selectedProd.currentStock})</span>
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min={1}
                                  className="h-10 w-24 rounded-xl border-border/60 bg-background/60 font-bold text-xs text-center"
                                  {...field}
                                />
                              )}
                            />
                          </TableCell>

                          <TableCell className="font-semibold text-xs text-muted-foreground whitespace-nowrap">
                            {formatCurrency(unitPrice(products?.data, watchedItems[index]?.productId))}
                          </TableCell>

                          {discountMode === 'PRODUCT' && (
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.discountType`}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger className="h-9 w-16 rounded-xl border-border/60 bg-background/60 px-2 text-xs font-extrabold">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl">
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
                                          className="h-9 w-20 rounded-xl border-border/60 bg-background/60 text-xs font-semibold"
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

                          <TableCell className="whitespace-nowrap">
                            <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
                          </TableCell>

                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={fields.length === 1}
                              onClick={() => remove(index)}
                              className="size-8 rounded-xl text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-3 sm:hidden">
              {fields.map((rowField, index) => {
                const selectedProd = products?.data.find((p) => p.id === watchedItems[index]?.productId);
                const reqQty = Number(watchedItems[index]?.quantity) || 0;
                const stockWarning = selectedProd && reqQty > selectedProd.currentStock;

                return (
                  <div key={rowField.id} className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-muted-foreground">Line Item #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        className="size-8 rounded-xl text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Product</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60 text-xs font-semibold">
                                <SelectValue placeholder="Select product item..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl">
                              {products?.data.map((product) => (
                                <SelectItem key={product.id} value={product.id} className="text-xs">
                                  {product.name} ({product.currentStock} in stock)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    {stockWarning && (
                      <p className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                        <AlertCircle className="size-3 shrink-0" />
                        <span>Qty ({reqQty}) exceeds stock ({selectedProd.currentStock})</span>
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} className="h-10 rounded-xl border-border/60 bg-background/60 text-xs font-bold" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Wholesale Rate</p>
                        <p className="h-10 flex items-center font-bold text-xs text-foreground">
                          {formatCurrency(unitPrice(products?.data, watchedItems[index]?.productId))}
                        </p>
                      </div>
                    </div>

                    {discountMode === 'PRODUCT' && (
                      <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.discountType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Type</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs font-bold">
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
                              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Discount</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} step="0.01" placeholder="0" className="h-9 rounded-xl border-border/60 text-xs font-semibold" {...field} />
                              </FormControl>
                              <FormMessage className="text-[10px]" />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <div className="flex justify-between border-t border-border/50 pt-2 text-xs">
                      <span className="font-bold text-muted-foreground">Line Total</span>
                      <LineTotal control={form.control} index={index} products={products?.data} discountMode={discountMode} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Financial Summary & Actions */}
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Left: Order-wide discount controls */}
            <div className="sm:max-w-xs w-full space-y-2">
              {discountMode === 'ORDER' ? (
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                          Order Discount Type
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
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
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                          {discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount $'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={discountType === 'PERCENTAGE' ? 100 : undefined}
                            step="0.01"
                            placeholder="0"
                            className="h-10 rounded-xl border-border/60 bg-background/60 font-semibold text-xs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-background/50 p-3 text-xs font-medium text-muted-foreground">
                  Per-product discount active. Set individual discounts in the table above.
                </div>
              )}
            </div>

            {/* Right: Calculations & CTA */}
            <div className="flex flex-col sm:items-end gap-4 sm:w-80">
              <div className="w-full space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span className="font-bold text-foreground">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Total Discount</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">−{formatCurrency(discountAmountTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 text-base font-black text-foreground">
                  <span>Net Order Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none rounded-2xl font-bold h-11 px-5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  className="flex-1 sm:flex-none rounded-2xl font-black h-11 px-6 shadow-md hover:shadow-lg transition-all"
                >
                  {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  <span>{isEdit ? 'Save Order Changes' : 'Create Order Now'}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
