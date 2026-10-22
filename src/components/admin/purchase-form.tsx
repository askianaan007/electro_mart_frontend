'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  Camera,
  ChevronDown,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ScanLine,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchPicker } from '@/components/search-picker';
import { ProductPickerRow, productForCode, productSearchText } from '@/components/admin/product-line-parts';
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
import { CameraScanDialog } from '@/components/scan/camera-scan-dialog';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { useAllSuppliers } from '@/hooks/use-suppliers';
import { useAllProducts } from '@/hooks/use-products';
import { useCreatePurchase, useUpdatePurchase } from '@/hooks/use-purchases';
import { useScanCode } from '@/hooks/use-product-units';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { getErrorMessage } from '@/lib/api/error';
import { cleanSerial, scanBeep, UNIT_STATUS_LABEL } from '@/lib/serial';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product, Purchase, Supplier } from '@/lib/api/types';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Min 1'),
  unitCost: z.string().refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, 'Invalid cost'),
});

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  invoiceNumber: z.string().min(1, "Supplier's invoice number is required"),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  items: z.array(lineItemSchema).min(1, 'Add at least one product'),
  transportCharges: z
    .string()
    .refine((v) => v.trim() === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Invalid amount'),
});

type FormValues = z.infer<typeof schema>;

function LineTotal({ control, index }: { control: Control<FormValues>; index: number }) {
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const unitCost = useWatch({ control, name: `items.${index}.unitCost` });
  const total = (Number(quantity) || 0) * (Number(unitCost) || 0);
  return <span className="font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>;
}

function defaultValuesFor(purchase?: Purchase): FormValues {
  if (!purchase) {
    return {
      supplierId: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      items: [],
      transportCharges: '',
    };
  }
  return {
    supplierId: purchase.supplierId,
    invoiceNumber: purchase.invoiceNumber,
    purchaseDate: purchase.purchaseDate.slice(0, 10),
    items: purchase.items.map((item) => ({
      productId: item.productId,
      quantity: String(item.quantity),
      unitCost: String(item.unitCost),
    })),
    transportCharges: Number(purchase.transportCharges) > 0 ? String(purchase.transportCharges) : '',
  };
}

function supplierSearchText(supplier: Supplier) {
  return [supplier.name, supplier.contact, supplier.phone].filter(Boolean).join(' ');
}

export function PurchaseForm({ purchase }: { purchase?: Purchase }) {
  const isEdit = !!purchase;
  const router = useRouter();
  const { data: suppliers, isLoading: suppliersLoading } = useAllSuppliers();
  const { data: products, isLoading: productsLoading } = useAllProducts({ status: 'ACTIVE' });
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase(purchase?.id ?? '');
  const scanCode = useScanCode();
  const pending = createPurchase.isPending || updatePurchase.isPending;

  // Products created from this screen show up before the product list refetches.
  const [created, setCreated] = useState<Product[]>([]);
  const fetched = products?.data ?? [];
  const productList = [...fetched, ...created.filter((c) => !fetched.some((p) => p.id === c.id))];

  const defaults = defaultValuesFor(purchase);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const transportChargesValue = Number(useWatch({ control: form.control, name: 'transportCharges' })) || 0;

  const [scanText, setScanText] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(!!defaults.transportCharges);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serials scanned on arrival, per product (optional — can be added later from the purchase page).
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  const [scanStates, setScanStates] = useState<Record<string, SerialScanState>>({});
  const [serialsOpen, setSerialsOpen] = useState<Record<string, boolean>>({});
  const registeredByProduct = new Map<string, number>();
  for (const unit of purchase?.units ?? []) {
    registeredByProduct.set(unit.productId, (registeredByProduct.get(unit.productId) ?? 0) + 1);
  }
  const trackedLines = [...new Set(watchedItems.map((i) => i.productId).filter(Boolean))]
    .map((productId) => {
      const product = productList.find((p) => p.id === productId);
      const quantity = watchedItems
        .filter((i) => i.productId === productId)
        .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      return { productId, product, room: Math.max(0, quantity - (registeredByProduct.get(productId) ?? 0)) };
    })
    .filter((line) => line.product?.trackSerials);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | undefined>();

  function openQuickAdd(index: number | null, barcode?: string) {
    setQuickAddIndex(index);
    setQuickAddBarcode(barcode);
    setQuickAddOpen(true);
  }

  function flash(productId: string) {
    setFlashId(productId);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashId(null), 1400);
    requestAnimationFrame(() =>
      document.getElementById(`pline-${productId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
  }

  /** Adds one unit of a product to its line (cost from the product), or a new line. */
  function addProduct(product: Product) {
    const items = form.getValues('items');
    const index = items.findIndex((item) => item.productId === product.id);
    if (index >= 0) {
      const next = (Number(items[index].quantity) || 0) + 1;
      form.setValue(`items.${index}.quantity`, String(next), { shouldValidate: true });
    } else {
      append(
        { productId: product.id, quantity: '1', unitCost: String(product.costPrice ?? 0) },
        { shouldFocus: false },
      );
    }
    form.clearErrors('items');
    flash(product.id);
  }

  /** Swaps the product on a line and takes its cost price, as picking a product always did. */
  function changeProduct(index: number, product: Product) {
    form.setValue(`items.${index}.productId`, product.id, { shouldValidate: true });
    form.setValue(`items.${index}.unitCost`, String(product.costPrice ?? 0), { shouldValidate: true });
    flash(product.id);
  }

  function handleProductCreated(product: Product) {
    setCreated((prev) => [...prev, product]);
    if (quickAddIndex !== null && form.getValues(`items.${quickAddIndex}`)) changeProduct(quickAddIndex, product);
    else addProduct(product);
  }

  function setQuantity(index: number, next: number) {
    if (next < 1) return;
    form.setValue(`items.${index}.quantity`, String(next), { shouldValidate: true });
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

    try {
      const result = await scanCode.mutateAsync(code);
      if (result.kind === 'PRODUCT') {
        const product = result.product && productList.find((p) => p.id === result.product!.id);
        if (!product) throw new Error(`"${result.product?.name ?? code}" is not an active product`);
        scanBeep(true);
        addProduct(product);
        return;
      }
      scanBeep(false);
      if (result.kind === 'UNIT') {
        const unit = result.units[0];
        toast.error(
          `Serial ${code} is already registered (${unit.product.name} — ${(
            UNIT_STATUS_LABEL[unit.status] ?? unit.status
          ).toLowerCase()})`,
        );
        return;
      }
      toast.error(`No product has the code ${code}`, {
        description:
          "New box? Tap New product — this code is saved as its barcode. A unit serial goes in the product's Serial numbers box.",
        action: { label: 'New product', onClick: () => openQuickAdd(null, code) },

      });
    } catch (error) {
      scanBeep(false);
      toast.error(error instanceof Error && !('isAxiosError' in error) ? error.message : getErrorMessage(error));
    }
  }

  // A USB/Bluetooth scanner works anywhere on the page, even with nothing focused.
  useBarcodeScanner((code) => void handleCode(code), { enabled: !cameraOpen && !quickAddOpen });

  const grandTotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );
  const unitCount = watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const onSubmit = form.handleSubmit(
    (values) => {
      const tracked = new Set(trackedLines.map((l) => l.productId));
      for (const line of trackedLines) {
        const state = scanStates[line.productId];
        const count = serials[line.productId]?.length ?? 0;
        if (count > line.room || (count > 0 && state && (!state.ok || state.pending))) {
          setSerialsOpen((prev) => ({ ...prev, [line.productId]: true }));
          toast.error(`Check the serials of ${line.product?.name ?? 'a product'} — some are marked in red`);
          return;
        }
      }
      // Serials ride on the first line of their product.
      const seen = new Set<string>();
      const payload = {
        supplierId: values.supplierId,
        invoiceNumber: values.invoiceNumber,
        purchaseDate: values.purchaseDate,
        items: values.items.map((item) => {
          const first = !seen.has(item.productId);
          seen.add(item.productId);
          const chosen = first && tracked.has(item.productId) ? (serials[item.productId] ?? []) : [];
          return {
            productId: item.productId,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            ...(chosen.length > 0 && { serials: chosen }),
          };
        }),
        transportCharges: values.transportCharges.trim() === '' ? undefined : Number(values.transportCharges),
      };

      if (isEdit) {
        updatePurchase.mutate(payload, {
          onSuccess: (updated) => {
            toast.success('Purchase updated — stock reconciled');
            router.push(`/admin/purchases/${updated.id}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      } else {
        createPurchase.mutate(payload, {
          onSuccess: (createdPurchase) => {
            toast.success('Purchase recorded — stock updated');
            router.push(`/admin/purchases/${createdPurchase.id}`);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      }
    },
    (errors) => {
      // Transport charges live in the folded section — unfold it so the error is visible.
      if (errors.transportCharges) setExtrasOpen(true);
      toast.error('Please fix the highlighted fields');
    },
  );

  const itemsError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message;
  const firstLineIndex = new Map<string, number>();
  watchedItems.forEach((item, index) => {
    if (item.productId && !firstLineIndex.has(item.productId)) firstLineIndex.set(item.productId, index);
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title={isEdit ? 'Edit purchase' : 'Record a purchase'}
        description={
          isEdit
            ? "Stock is reconciled on save — quantities already sold can't be reduced."
            : 'Stock goes up as soon as you save.'
        }
        onBack={() => router.back()}
      />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 1 · Supplier & invoice */}
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Supplier</FormLabel>
                    <FormControl>
                      <SearchPicker
                        items={suppliers?.data ?? []}
                        value={field.value}
                        onChange={field.onChange}
                        getId={(supplier) => supplier.id}
                        getSearchText={supplierSearchText}
                        title="Select supplier"
                        placeholder="Choose supplier"
                        searchPlaceholder="Name, contact or phone"
                        emptyText="No suppliers found"
                        loading={suppliersLoading}
                        invalid={!!fieldState.error}
                        className="min-h-11"
                        renderValue={(supplier) => (
                          <span className="block truncate font-medium text-foreground">{supplier.name}</span>
                        )}
                        renderItem={(supplier) => (
                          <>
                            <span className="block truncate font-medium">{supplier.name}</span>
                            {(supplier.contact || supplier.phone) && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {[supplier.contact, supplier.phone].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice no.</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Supplier's invoice"
                          autoComplete="off"
                          autoCapitalize="characters"
                          className="h-10 text-base sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-10 text-base sm:text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2 · Products */}
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Products
                  {fields.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {fields.length} {fields.length === 1 ? 'item' : 'items'} · {unitCount} pcs
                    </span>
                  )}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => openQuickAdd(null)}>
                  <Plus />
                  New product
                </Button>
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
                emptyText="No products found — use New product"
                loading={productsLoading}
                className="min-h-11"
                icon={<Search className="size-4 shrink-0 text-muted-foreground" />}
                renderValue={() => null}
                renderItem={(product) => <ProductPickerRow product={product} price={product.costPrice} />}
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
                    placeholder="Scan product barcode"
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
                    Search above or scan the box barcode. Scanning again adds one more.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {fields.map((rowField, index) => {
                    const line = watchedItems[index];
                    const product = productList.find((p) => p.id === line?.productId);
                    const qty = Number(line?.quantity) || 0;
                    const lineErrors = form.formState.errors.items?.[index];
                    const tracked =
                      line?.productId && firstLineIndex.get(line.productId) === index
                        ? trackedLines.find((t) => t.productId === line.productId)
                        : undefined;
                    const scanned = tracked ? (serials[tracked.productId]?.length ?? 0) : 0;
                    const registered = tracked ? (registeredByProduct.get(tracked.productId) ?? 0) : 0;
                    const showSerials = tracked && (serialsOpen[tracked.productId] ?? scanned > 0);
                    return (
                      <li
                        key={rowField.id}
                        id={`pline-${line?.productId}`}
                        className={cn(
                          'space-y-2 p-3 transition-colors duration-700',
                          flashId === line?.productId && 'bg-primary/10',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium text-foreground">
                              {product?.name ?? (line?.productId ? 'Product unavailable' : 'Choose a product')}
                            </p>
                            {product && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-mono">{product.productCode}</span> · {product.currentStock} in
                                stock
                              </p>
                            )}
                            <div className="flex items-center gap-3">
                              <SearchPicker
                                items={productList}
                                value=""
                                onChange={(id) => {
                                  const next = productList.find((p) => p.id === id);
                                  if (next) changeProduct(index, next);
                                }}
                                getId={(p) => p.id}
                                getSearchText={productSearchText}
                                title="Change product"
                                placeholder="Change"
                                searchPlaceholder="Name, code, brand or model"
                                emptyText="No products found"
                                loading={productsLoading}
                                className="mt-0.5 min-h-0 w-auto gap-0.5 border-0 bg-transparent p-0 text-xs text-primary shadow-none hover:bg-transparent hover:underline dark:bg-transparent [&_span]:text-primary"
                                renderValue={() => null}
                                renderItem={(p) => <ProductPickerRow product={p} price={p.costPrice} />}
                              />
                              <button
                                type="button"
                                onClick={() => openQuickAdd(index)}
                                className="mt-0.5 text-xs text-primary hover:underline"
                              >
                                New product
                              </button>
                            </div>
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

                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="flex items-end gap-3">
                            <div className="space-y-1">
                              <span className="block text-[11px] text-muted-foreground">Qty</span>
                              <div className="flex items-center rounded-md border border-input">
                                <button
                                  type="button"
                                  aria-label="Less"
                                  onClick={() => setQuantity(index, qty - 1)}
                                  disabled={qty <= 1}
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
                            </div>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitCost`}
                              render={({ field }) => (
                                <label className="space-y-1">
                                  <span className="block text-[11px] text-muted-foreground">Cost each</span>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    onFocus={(e) => e.target.select()}
                                    aria-invalid={!!lineErrors?.unitCost}
                                    className="h-10 w-28 text-right text-base tabular-nums sm:text-sm"
                                    {...field}
                                  />
                                </label>
                              )}
                            />
                          </div>
                          <LineTotal control={form.control} index={index} />
                        </div>

                        {(lineErrors?.quantity || lineErrors?.unitCost) && (
                          <p className="text-xs font-medium text-destructive">
                            {lineErrors.quantity
                              ? 'Quantity must be a whole number, 1 or more'
                              : 'Enter a valid cost (0 or more)'}
                          </p>
                        )}

                        {tracked && (
                          <div className="rounded-md border border-dashed border-border">
                            <button
                              type="button"
                              onClick={() => setSerialsOpen((prev) => ({ ...prev, [tracked.productId]: !showSerials }))}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                              aria-expanded={!!showSerials}
                            >
                              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <ScanLine className="size-3.5" />
                                Serial numbers
                                <span className="font-normal text-muted-foreground">
                                  {scanned}/{tracked.room}
                                  {registered > 0 && ` · ${registered} already registered`} · optional
                                </span>
                              </span>
                              <ChevronDown
                                className={cn(
                                  'size-4 text-muted-foreground transition-transform',
                                  showSerials && 'rotate-180',
                                )}
                              />
                            </button>
                            {showSerials && (
                              <div className="border-t border-dashed border-border p-3">
                                {tracked.room > 0 ? (
                                  <SerialScanInput
                                    productId={tracked.productId}
                                    context="RECEIVE"
                                    purchaseId={purchase?.id}
                                    value={serials[tracked.productId] ?? []}
                                    onChange={(next) => setSerials((prev) => ({ ...prev, [tracked.productId]: next }))}
                                    max={tracked.room}
                                    onStateChange={(state) =>
                                      setScanStates((prev) => ({ ...prev, [tracked.productId]: state }))
                                    }
                                  />
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Every unit of this product already has a serial.
                                  </p>
                                )}
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  {isEdit
                                    ? 'Scan serials for units of this purchase that do not have one yet.'
                                    : 'Scan each unit as it is unpacked — or skip and add them later from the purchase page.'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* 3 · Transport charges, folded away */}
          <Card>
            <button
              type="button"
              onClick={() => setExtrasOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left sm:px-5"
              aria-expanded={extrasOpen}
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">Transport charges</span>
                <span className="block text-xs text-muted-foreground">
                  {transportChargesValue > 0
                    ? `${formatCurrency(transportChargesValue)} deducted from supplier credit`
                    : 'Optional'}
                </span>
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', extrasOpen && 'rotate-180')}
              />
            </button>
            {extrasOpen && (
              <CardContent className="border-t border-border p-4 sm:p-5">
                <FormField
                  control={form.control}
                  name="transportCharges"
                  render={({ field }) => (
                    <FormItem className="sm:max-w-56">
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          className="h-10 text-base tabular-nums sm:text-sm"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Only if the supplier is responsible for shipping this — deducted from their credit balance.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>

          {/* Total + save, always in reach */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5 sm:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? 'item' : 'items'} · {unitCount} pcs
                  {transportChargesValue > 0 && ` · −${formatCurrency(transportChargesValue)} transport`}
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
                  {isEdit ? 'Save changes' : 'Save purchase'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <ProductFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={handleProductCreated}
        initialBarcode={quickAddBarcode}
        fromPurchase
      />


      {cameraOpen && (
        <CameraScanDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          mode="multi"
          title="Scan products"
          description="Scan each box's product barcode. Each scan adds one."
          onDetect={(code) => void handleCode(code)}
        />
      )}
    </div>
  );
}
