'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronDown,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { SearchPicker } from '@/components/search-picker';
import { CameraScanDialog } from '@/components/scan/camera-scan-dialog';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useAllProducts } from '@/hooks/use-products';
import { useCreateOrder, useUpdateOrder } from '@/hooks/use-orders';
import { useScanCode } from '@/hooks/use-product-units';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { getErrorMessage } from '@/lib/api/error';
import { cleanSerial, scanBeep, serialKey, UNIT_STATUS_LABEL } from '@/lib/serial';
import { cn, formatCurrency } from '@/lib/utils';
import type { Dealer, Order, Product } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Min 1'),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.string(),
  /** Serials scanned for this line (new orders only). */
  serials: z.array(z.string()),
});

const schema = z
  .object({
    dealerId: z.string().min(1, 'Select a dealer'),
    recordAsCompleted: z.boolean(),
    saleDate: z.string(),
    items: z.array(lineItemSchema).min(1, 'Add at least one product'),
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
          message: 'Max 100%',
        });
      }
    });
  });

type FormValues = z.infer<typeof schema>;
type DiscountChoice = 'NONE' | 'ORDER' | 'PRODUCT';

const emptyLine = (productId: string): FormValues['items'][number] => ({
  productId,
  quantity: '1',
  discountType: 'PERCENTAGE',
  discountValue: '',
  serials: [],
});

function unitPrice(products: Product[] | undefined, productId: string | undefined) {
  return Number(products?.find((p) => p.id === productId)?.wholesalePrice ?? 0);
}

function lineDiscountAmount(lineTotal: number, discountType: 'PERCENTAGE' | 'FIXED', discountValue: string) {
  const value = Number(discountValue) || 0;
  if (value <= 0) return 0;
  return discountType === 'PERCENTAGE' ? (lineTotal * value) / 100 : Math.min(value, lineTotal);
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
      items: [],
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
      serials: [],
    })),
    discountMode,
    discountType: 'FIXED',
    discountValue: discountMode === 'ORDER' && Number(order.discount) > 0 ? String(order.discount) : '',
  };
}

function dealerSearchText(dealer: Dealer) {
  return [dealer.businessName, dealer.ownerName, dealer.phone, dealer.district].filter(Boolean).join(' ');
}

function productSearchText(product: Product) {
  return [product.name, product.productCode, product.brand, product.model, product.sku, product.barcode]
    .filter(Boolean)
    .join(' ');
}

/** Product barcode / SKU / code that equals a scanned value. */
function productForCode(products: Product[], code: string) {
  const key = serialKey(code);
  return products.find((p) => [p.barcode, p.sku, p.productCode].some((v) => v && serialKey(v) === key));
}

function ProductRow({ product }: { product: Product }) {
  return (
    <>
      <span className="line-clamp-2 font-medium">{product.name}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="font-mono">{product.productCode}</span>
        <span
          className={cn('tabular-nums', product.currentStock <= 0 ? 'font-medium text-destructive' : 'text-success')}
        >
          {product.currentStock <= 0 ? 'Out of stock' : `${product.currentStock} in stock`}
        </span>
        <span className="tabular-nums">{formatCurrency(product.wholesalePrice)}</span>
      </span>
    </>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex w-full rounded-md border border-border bg-muted/40 p-0.5 sm:w-auto">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-none',
            value === option.value
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LineTotal({
  control,
  index,
  products,
  perItemDiscount,
}: {
  control: Control<FormValues>;
  index: number;
  products: Product[] | undefined;
  perItemDiscount: boolean;
}) {
  const productId = useWatch({ control, name: `items.${index}.productId` });
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const discountType = useWatch({ control, name: `items.${index}.discountType` });
  const discountValue = useWatch({ control, name: `items.${index}.discountValue` });
  const gross = (Number(quantity) || 0) * unitPrice(products, productId);
  const discount = perItemDiscount ? lineDiscountAmount(gross, discountType, discountValue) : 0;

  if (discount <= 0) {
    return <span className="font-semibold tabular-nums text-foreground">{formatCurrency(gross)}</span>;
  }
  return (
    <span className="flex flex-col items-end tabular-nums leading-tight">
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(gross)}</span>
      <span className="font-semibold text-success">{formatCurrency(Math.max(gross - discount, 0))}</span>
    </span>
  );
}

export function OrderForm({ order }: { order?: Order }) {
  const isEdit = !!order;
  const router = useRouter();
  const { data: dealers, isLoading: dealersLoading } = useAllCustomer();
  const { data: products, isLoading: productsLoading } = useAllProducts({ status: 'ACTIVE' });
  const productList = products?.data ?? [];
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(order?.id ?? '');
  const scanCode = useScanCode();
  const pending = createOrder.isPending || updateOrder.isPending;

  const defaults = defaultValuesFor(order);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const [discountChoice, setDiscountChoice] = useState<DiscountChoice>(
    defaults.discountMode === 'PRODUCT' ? 'PRODUCT' : defaults.discountValue ? 'ORDER' : 'NONE',
  );
  // Open when it holds something already set (a discount, or the sale date of a completed order).
  const [moreOpen, setMoreOpen] = useState(discountChoice !== 'NONE' || (isEdit && defaults.recordAsCompleted));
  const [scanText, setScanText] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const discountType = useWatch({ control: form.control, name: 'discountType' });
  const discountValue = Number(useWatch({ control: form.control, name: 'discountValue' })) || 0;
  const recordAsCompleted = useWatch({ control: form.control, name: 'recordAsCompleted' });
  const saleDate = useWatch({ control: form.control, name: 'saleDate' });
  const perItemDiscount = discountChoice === 'PRODUCT';

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * unitPrice(productList, item.productId),
    0,
  );
  const productDiscountTotal = watchedItems.reduce((sum, item) => {
    const gross = (Number(item.quantity) || 0) * unitPrice(productList, item.productId);
    return sum + lineDiscountAmount(gross, item.discountType, item.discountValue);
  }, 0);
  const discountAmountTotal =
    discountChoice === 'PRODUCT'
      ? productDiscountTotal
      : discountChoice === 'ORDER'
        ? discountType === 'PERCENTAGE'
          ? (subtotal * discountValue) / 100
          : Math.min(discountValue, subtotal)
        : 0;
  const grandTotal = Math.max(subtotal - discountAmountTotal, 0);
  const unitCount = watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const allSerials = watchedItems.flatMap((item) => item.serials ?? []);

  function chooseDiscount(choice: DiscountChoice) {
    setDiscountChoice(choice);
    form.setValue('discountMode', choice === 'PRODUCT' ? 'PRODUCT' : 'ORDER');
    if (choice !== 'PRODUCT') {
      form.getValues('items').forEach((_, index) => form.setValue(`items.${index}.discountValue`, ''));
    }
    if (choice !== 'ORDER') form.setValue('discountValue', '');
  }

  function flash(productId: string) {
    setFlashId(productId);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 1400);
    requestAnimationFrame(() =>
      document.getElementById(`line-${productId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  }

  /** Adds one unit of a product (merging into its line), optionally with the scanned serial. */
  function addProduct(product: Product, serial?: string) {
    const items = form.getValues('items');
    const index = items.findIndex((item) => item.productId === product.id);
    let quantity = 1;
    if (index >= 0) {
      const line = items[index];
      const serials = serial ? [...line.serials, serial] : line.serials;
      // A serial for a unit already counted fills that unit; otherwise it's one more.
      quantity = serial ? Math.max(Number(line.quantity) || 0, serials.length) : (Number(line.quantity) || 0) + 1;
      form.setValue(`items.${index}.quantity`, String(quantity), { shouldValidate: true });
      form.setValue(`items.${index}.serials`, serials);
    } else {
      append({ ...emptyLine(product.id), serials: serial ? [serial] : [] }, { shouldFocus: false });
    }
    form.clearErrors('items');
    if (quantity > product.currentStock) {
      toast.warning(`Only ${product.currentStock} of "${product.name}" in stock`);
    }
    flash(product.id);
  }

  /** Swaps the product on a line; merges into the line that already has it. */
  function changeProduct(index: number, productId: string) {
    const items = form.getValues('items');
    if (items[index].productId === productId) return;
    const existing = items.findIndex((item, i) => i !== index && item.productId === productId);
    if (existing >= 0) {
      const merged = (Number(items[existing].quantity) || 0) + (Number(items[index].quantity) || 0);
      form.setValue(`items.${existing}.quantity`, String(merged), { shouldValidate: true });
      remove(index);
      toast.info('Merged into the existing line for that product');
    } else {
      form.setValue(`items.${index}.productId`, productId, { shouldValidate: true });
      // Scanned serials belong to the old product.
      form.setValue(`items.${index}.serials`, []);
    }
    flash(productId);
  }

  function setQuantity(index: number, next: number) {
    const line = form.getValues(`items.${index}`);
    const min = Math.max(1, line.serials.length);
    if (next < min) {
      if (line.serials.length >= 1 && next >= 1) toast.info('Remove a scanned serial first to lower the quantity');
      return;
    }
    form.setValue(`items.${index}.quantity`, String(next), { shouldValidate: true });
  }

  function removeSerial(index: number, serial: string) {
    const line = form.getValues(`items.${index}`);
    form.setValue(
      `items.${index}.serials`,
      line.serials.filter((s) => s !== serial),
    );
  }

  async function handleCode(raw: string) {
    const code = cleanSerial(raw);
    if (!code) return;

    const byCode = productForCode(productList, code);
    if (byCode) {
      scanBeep(true);
      addProduct(byCode);
      return;
    }
    const taken = form.getValues('items').flatMap((item) => item.serials);
    if (taken.some((s) => serialKey(s) === serialKey(code))) {
      scanBeep(false);
      toast.error(`Serial ${code} is already in this order`);
      return;
    }

    try {
      const result = await scanCode.mutateAsync(code);
      if (result.kind === 'PRODUCT') {
        const product = result.product && productList.find((p) => p.id === result.product!.id);
        if (!product) throw new Error(`"${result.product?.name ?? code}" is not an active product`);
        scanBeep(true);
        addProduct(product);
        return;
      }
      if (result.kind === 'NONE') throw new Error(`No product or serial matches ${code}`);

      const available = result.units.filter((u) => u.status === 'IN_STOCK' && u.condition === 'GOOD');
      if (available.length !== 1) {
        const unit = result.units[0];
        if (result.units.length > 1 && available.length > 1) {
          throw new Error(`${code} matches serials of several products — add the product by search instead`);
        }
        throw new Error(
          unit.condition === 'DEFECTIVE'
            ? `Serial ${code} is marked defective`
            : `Serial ${code} is ${(UNIT_STATUS_LABEL[unit.status] ?? unit.status).toLowerCase()} — not available`,
        );
      }
      const product = productList.find((p) => p.id === available[0].product.id);
      if (!product) throw new Error(`"${available[0].product.name}" is not an active product`);
      scanBeep(true);
      // Serials are only sent when creating; on edits they're managed from the order page.
      addProduct(product, isEdit ? undefined : available[0].serialNumber);
    } catch (error) {
      scanBeep(false);
      toast.error(error instanceof Error && !('isAxiosError' in error) ? error.message : getErrorMessage(error));
    }
  }

  // A USB/Bluetooth scanner works anywhere on the page, even with nothing focused.
  useBarcodeScanner((code) => void handleCode(code), { enabled: !cameraOpen });

  const onSubmit = form.handleSubmit(
    (values) => {
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
          const gross = Number(item.quantity) * unitPrice(productList, item.productId);
          if (value > gross) {
            form.setError(`items.${i}.discountValue`, { message: 'More than line total' });
            return;
          }
        }
      }

      const items = values.items.map((item) => {
        const base = {
          productId: item.productId,
          quantity: Number(item.quantity),
          ...(!isEdit && item.serials.length > 0 ? { serials: item.serials } : {}),
        };
        if (values.discountMode !== 'PRODUCT') return base;
        const value = item.discountValue.trim() === '' ? 0 : Number(item.discountValue);
        if (value <= 0) return base;
        return {
          ...base,
          discountPercentage: item.discountType === 'PERCENTAGE' ? value : undefined,
          discountAmount: item.discountType === 'FIXED' ? value : undefined,
        };
      });

      const payload = {
        dealerId: values.dealerId,
        saleDate: values.recordAsCompleted ? values.saleDate : undefined,
        items,
        discountPercentage: orderDiscountPercentage,
        discountAmount: orderDiscountAmount,
      };

      if (isEdit) {
        updateOrder.mutate(payload, {
          onSuccess: (updated) => {
            toast.success('Order updated — stock and dealer balance reconciled');
            router.push(`/admin/orders/${updated.id}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      } else {
        createOrder.mutate(payload, {
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
        });
      }
    },
    (errors) => {
      // Discount and sale date live in the folded section — unfold it so the error is visible.
      if (errors.discountValue || errors.saleDate) setMoreOpen(true);
      toast.error('Please fix the highlighted fields');
    },
  );

  const itemsError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={isEdit ? `Edit order #${order.orderNumber}` : 'New order'}
        description={isEdit ? 'Change products, quantities or discount.' : 'Choose a dealer, add products, done.'}
        onBack={() => router.back()}
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 1 · Dealer */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <FormField
                control={form.control}
                name="dealerId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Dealer</FormLabel>
                    <FormControl>
                      <SearchPicker
                        items={dealers?.data ?? []}
                        value={field.value}
                        onChange={field.onChange}
                        getId={(dealer) => dealer.id}
                        getSearchText={dealerSearchText}
                        title="Select dealer"
                        placeholder="Choose dealer"
                        searchPlaceholder="Business, owner, phone or area"
                        emptyText="No dealers found"
                        loading={dealersLoading}
                        invalid={!!fieldState.error}
                        className="min-h-11"
                        renderValue={(dealer) => (
                          <span className="block min-w-0">
                            <span className="block truncate font-medium text-foreground">{dealer.businessName}</span>
                            {dealer.ownerName && (
                              <span className="block truncate text-xs text-muted-foreground">{dealer.ownerName}</span>
                            )}
                          </span>
                        )}
                        renderItem={(dealer) => (
                          <>
                            <span className="block truncate font-medium">{dealer.businessName}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[dealer.ownerName, dealer.phone, dealer.district].filter(Boolean).join(' · ')}
                            </span>
                          </>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 2 · Products */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Products</p>
                {fields.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {fields.length} {fields.length === 1 ? 'item' : 'items'} · {unitCount} pcs
                  </span>
                )}
              </div>

              <SearchPicker
                items={productList}
                value=""
                onChange={(id) => {
                  const product = productList.find((p) => p.id === id);
                  if (product) addProduct(product);
                }}
                getId={(product) => product.id}
                getSearchText={productSearchText}
                title="Add product"
                placeholder="Search product to add"
                searchPlaceholder="Name, code, brand or model"
                emptyText="No products found"
                loading={productsLoading}
                className="min-h-11"
                icon={<Search className="size-4 shrink-0 text-muted-foreground" />}
                renderValue={() => null}
                renderItem={(product) => <ProductRow product={product} />}
              />

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={scanText}
                    onChange={(e) => setScanText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || (e.key === 'Tab' && scanText.trim())) {
                        e.preventDefault();
                        const code = scanText;
                        setScanText('');
                        void handleCode(code);
                      }
                    }}
                    placeholder="Scan barcode or serial"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    className="h-11 pl-9 font-mono text-base sm:text-sm"
                  />
                  {scanCode.isPending && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() => setCameraOpen(true)}
                  aria-label="Scan with camera"
                >
                  <Camera />
                  <span className="hidden sm:inline">Camera</span>
                </Button>
              </div>

              {itemsError && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <AlertCircle className="size-4" /> {itemsError}
                </p>
              )}

              {fields.length === 0 ? (
                <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                  <PackagePlus className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No products yet</p>
                  <p className="text-xs text-muted-foreground">
                    Search above, or scan a barcode. Scanning again adds one more.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {fields.map((rowField, index) => {
                    const line = watchedItems[index];
                    const product = productList.find((p) => p.id === line?.productId);
                    const qty = Number(line?.quantity) || 0;
                    const overStock = product && qty > product.currentStock;
                    return (
                      <li
                        key={rowField.id}
                        id={`line-${line?.productId}`}
                        className={cn(
                          'space-y-2 p-3 transition-colors duration-700',
                          flashId === line?.productId && 'bg-primary/10',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium text-foreground">
                              {product?.name ?? 'Product unavailable'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product && (
                                <>
                                  <span className="font-mono">{product.productCode}</span> ·{' '}
                                  {formatCurrency(product.wholesalePrice)} each
                                </>
                              )}
                            </p>
                            <SearchPicker
                              items={productList}
                              value=""
                              onChange={(id) => changeProduct(index, id)}
                              getId={(p) => p.id}
                              getSearchText={productSearchText}
                              title="Change product"
                              placeholder="Change"
                              searchPlaceholder="Name, code, brand or model"
                              emptyText="No products found"
                              loading={productsLoading}
                              className="mt-0.5 min-h-0 w-auto gap-0.5 border-0 bg-transparent p-0 text-xs text-primary shadow-none hover:bg-transparent hover:underline dark:bg-transparent [&_span]:text-primary"
                              renderValue={() => null}
                              renderItem={(p) => <ProductRow product={p} />}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            aria-label="Remove product"
                            className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-md border border-input">
                            <button
                              type="button"
                              aria-label="Less"
                              onClick={() => setQuantity(index, qty - 1)}
                              disabled={qty <= Math.max(1, line?.serials.length ?? 0)}
                              className="flex size-10 items-center justify-center text-foreground disabled:opacity-40"
                            >
                              <Minus className="size-4" />
                            </button>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  aria-label="Quantity"
                                  onFocus={(e) => e.target.select()}
                                  className="h-10 w-14 border-x border-input bg-transparent text-center text-base tabular-nums outline-none [appearance:textfield] focus:bg-muted/40 sm:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              )}
                            />
                            <button
                              type="button"
                              aria-label="More"
                              onClick={() => setQuantity(index, qty + 1)}
                              className="flex size-10 items-center justify-center text-foreground"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <LineTotal
                            control={form.control}
                            index={index}
                            products={productList}
                            perItemDiscount={perItemDiscount}
                          />
                        </div>

                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-xs font-medium text-destructive">
                            Quantity must be a whole number, 1 or more
                          </p>
                        )}

                        {overStock && (
                          <p className="flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                            <AlertCircle className="size-3 shrink-0" />
                            Requested {qty} but only {product.currentStock} in stock
                          </p>
                        )}

                        {line && line.serials.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {line.serials.map((serial) => (
                              <span
                                key={serial}
                                className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/5 py-0.5 pl-2 pr-0.5 font-mono text-xs text-foreground"
                              >
                                {serial}
                                <button
                                  type="button"
                                  aria-label={`Remove serial ${serial}`}
                                  onClick={() => removeSerial(index, serial)}
                                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {perItemDiscount && (
                          <div className="flex items-start gap-2">
                            <span className="pt-2 text-xs text-muted-foreground">Discount</span>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discountType`}
                              render={({ field }) => (
                                <Segmented
                                  value={field.value}
                                  onChange={field.onChange}
                                  options={[
                                    { value: 'PERCENTAGE', label: '%' },
                                    { value: 'FIXED', label: 'Amount' },
                                  ]}
                                />
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.discountValue`}
                              render={({ field }) => (
                                <FormItem className="w-24">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      min={0}
                                      step="0.01"
                                      placeholder="0"
                                      className="h-9 text-base tabular-nums sm:text-sm"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 3 · Optional extras, folded away */}
          <Card>
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-5"
              aria-expanded={moreOpen}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">Discount & options</span>
                <span className="block text-xs text-muted-foreground">
                  {[
                    discountChoice === 'NONE'
                      ? 'No discount'
                      : discountChoice === 'ORDER'
                        ? 'Order discount'
                        : 'Per-item discount',
                    recordAsCompleted ? `Completed sale · ${saleDate}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', moreOpen && 'rotate-180')}
              />
            </button>
            {moreOpen && (
              <CardContent className="space-y-4 border-t border-border p-4 sm:p-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Discount</p>
                  <Segmented
                    value={discountChoice}
                    onChange={chooseDiscount}
                    options={[
                      { value: 'NONE', label: 'None' },
                      { value: 'ORDER', label: 'Whole order' },
                      { value: 'PRODUCT', label: 'Per item' },
                    ]}
                  />
                  {discountChoice === 'ORDER' && (
                    <div className="flex items-start gap-2">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <Segmented
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: 'PERCENTAGE', label: '%' },
                              { value: 'FIXED', label: 'Amount' },
                            ]}
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                placeholder="0"
                                className="h-9 text-base tabular-nums sm:text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  {discountChoice === 'PRODUCT' && (
                    <p className="text-xs text-muted-foreground">Set a discount on each product above.</p>
                  )}
                </div>

                {!isEdit && (
                  <FormField
                    control={form.control}
                    name="recordAsCompleted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-3 border-t border-border pt-4">
                        <div className="min-w-0">
                          <FormLabel className="cursor-pointer text-sm font-medium">Already delivered</FormLabel>
                          <p className="text-xs text-muted-foreground">Complete the sale now and create the invoice.</p>
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
                      <FormItem className="sm:max-w-56">
                        <FormLabel>Sale date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="date"
                              max={new Date().toISOString().slice(0, 10)}
                              className="h-10 pl-9 text-base sm:text-sm"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            )}
          </Card>

          {/* Total + submit, always in reach */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5 sm:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {discountAmountTotal > 0
                    ? `${formatCurrency(subtotal)} − ${formatCurrency(discountAmountTotal)} discount`
                    : `${unitCount} pcs`}
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="hidden h-11 sm:inline-flex"
                >
                  Cancel
                </Button>
                <Button type="submit" loading={pending} className="h-11 px-6">
                  {isEdit ? 'Save changes' : recordAsCompleted ? 'Complete sale' : 'Create order'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {cameraOpen && (
        <CameraScanDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          mode="multi"
          title="Scan products"
          description="Scan each box's barcode or serial label. Each scan adds one."
          ignore={allSerials}
          onDetect={(code) => void handleCode(code)}
        />
      )}
    </div>
  );
}
