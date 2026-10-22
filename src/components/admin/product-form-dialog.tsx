'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Camera, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { SearchPicker } from '@/components/search-picker';
import { CategoryManagerDialog } from '@/components/admin/category-manager-dialog';
import { ProductImagesField } from '@/components/admin/product-images-field';
import { CameraScanDialog } from '@/components/scan/camera-scan-dialog';
import { useCreateProduct, useUpdateProduct, useUploadProductImages } from '@/hooks/use-products';
import { useAllCategories } from '@/hooks/use-categories';
import { getErrorMessage } from '@/lib/api/error';
import { focusNextOnEnter } from '@/lib/form-keyboard';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/api/types';

const numberField = (label: string) =>
  z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, `${label} must be a valid number`);

const optionalNumberField = z
  .string()
  .refine((v) => v.trim() === '' || !Number.isNaN(Number(v)), 'Enter a valid number');

const schema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  sku: z.string(),
  barcode: z.string(),
  name: z.string().min(1, 'Product name is required'),
  brand: z.string(),
  category: z.string(),
  model: z.string(),
  description: z.string(),
  costPrice: numberField('Cost price'),
  wholesalePrice: numberField('Wholesale price'),
  retailPrice: optionalNumberField,
  compareAtPrice: optionalNumberField,
  isFeatured: z.boolean(),
  currentStock: numberField('Current stock'),
  warranty: z.string(),
  trackSerials: z.boolean(),
  warrantyMonths: z
    .string()
    .refine(
      (v) => v.trim() === '' || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 240),
      'Whole months, 0–240',
    ),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormValues = z.infer<typeof schema>;

/** Fields inside the folded "Rep Portal" section — an error there unfolds it. */
const PORTAL_FIELDS = ['retailPrice', 'compareAtPrice'] as const;

function defaultValuesFor(product?: Product): FormValues {
  return {
    productCode: product?.productCode ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    category: product?.category ?? '',
    model: product?.model ?? '',
    description: product?.description ?? '',
    costPrice: product?.costPrice ?? '',
    wholesalePrice: product?.wholesalePrice ?? '',
    retailPrice: product?.retailPrice ?? '',
    compareAtPrice: product?.compareAtPrice ?? '',
    isFeatured: product?.isFeatured ?? false,
    currentStock: product ? String(product.currentStock) : '0',
    warranty: product?.warranty ?? '',
    trackSerials: product?.trackSerials ?? false,
    warrantyMonths: product?.warrantyMonths != null ? String(product.warrantyMonths) : '',
    status: product?.status ?? 'ACTIVE',
  };
}

// Props shared by the typing boxes: "Next" on the phone keyboard, no autofill noise.
const step = { 'data-step': '', enterKeyHint: 'next' as const, autoComplete: 'off', className: 'h-10' };
const codeStep = { ...step, autoCapitalize: 'characters', autoCorrect: 'off', spellCheck: false };
const money = { ...step, type: 'number', inputMode: 'decimal' as const, min: 0, step: '0.01', placeholder: '0.00' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

type CreateOptions = {
  /** Called with the new product once it's created (e.g. to add it to a purchase). */
  onCreated?: (product: Product) => void;
  /** A scanned code that matched no product — filled in as the new product's barcode. */
  initialBarcode?: string;
  /** Opened from Record Purchase: stock starts at 0 and comes from that purchase. */
  fromPurchase?: boolean;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  ...createOptions
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
} & CreateOptions) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={product ? 'Edit product' : 'Add product'} mobileFullScreen className="sm:max-w-2xl">
        {/* The body unmounts while closed, so every opening starts from the product's current values. */}
        <ProductFormBody product={product} close={() => onOpenChange(false)} {...createOptions} />
      </DialogContent>
    </Dialog>
  );
}

function ProductFormBody({
  product,
  close,
  onCreated,
  initialBarcode,
  fromPurchase,
}: { product?: Product; close: () => void } & CreateOptions) {
  const isEdit = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');
  const uploadImages = useUploadProductImages();
  const pending = createProduct.isPending || updateProduct.isPending;
  const { data: categories } = useAllCategories();
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [stagedImageFiles, setStagedImageFiles] = useState<File[]>([]);
  const [defaults] = useState(() => ({
    ...defaultValuesFor(product),
    ...(!product && initialBarcode ? { barcode: initialBarcode } : {}),
  }));
  // Unfolded when it already holds something.
  const [portalOpen, setPortalOpen] = useState(
    !!(defaults.retailPrice || defaults.compareAtPrice || defaults.isFeatured),
  );
  const [scanBarcodeOpen, setScanBarcodeOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const trackSerials = useWatch({ control: form.control, name: 'trackSerials' });

  const onSubmit = form.handleSubmit(
    (values) => {
      const payload: Record<string, unknown> = {
        productCode: values.productCode,
        sku: values.sku || undefined,
        barcode: values.barcode || undefined,
        name: values.name,
        brand: values.brand || undefined,
        category: values.category || undefined,
        model: values.model || undefined,
        description: values.description || undefined,
        costPrice: Number(values.costPrice),
        wholesalePrice: Number(values.wholesalePrice),
        retailPrice: values.retailPrice ? Number(values.retailPrice) : undefined,
        compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : undefined,
        isFeatured: values.isFeatured,
        warranty: values.warranty || undefined,
        trackSerials: values.trackSerials,
        warrantyMonths: values.warrantyMonths.trim() === '' ? null : Number(values.warrantyMonths),
        status: values.status,
      };

      if (isEdit) {
        updateProduct.mutate(payload, {
          onSuccess: () => {
            toast.success('Product updated');
            close();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      } else {
        payload.currentStock = Number(values.currentStock);
        createProduct.mutate(payload, {
          onSuccess: (created) => {
            toast.success(fromPurchase ? 'Product created and added to this purchase' : 'Product created');
            if (stagedImageFiles.length > 0) {
              uploadImages.mutate(
                { id: created.id, files: stagedImageFiles },
                { onError: (error) => toast.error(getErrorMessage(error)) },
              );
            }
            onCreated?.(created);
            close();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      }
    },
    (errors) => {
      if (PORTAL_FIELDS.some((name) => errors[name])) setPortalOpen(true);
      toast.error('Please fix the highlighted fields');
    },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit product' : 'Add a new product'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={onSubmit} onKeyDown={focusNextOnEnter} className="space-y-5">
          <Section title="Product">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product name</FormLabel>
                  <FormControl>
                    <Input {...field} {...step} autoCapitalize="words" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product code</FormLabel>
                    <FormControl>
                      <Input {...field} {...codeStep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Brand <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} {...step} autoCapitalize="words" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Model <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} {...codeStep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SKU <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} {...codeStep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category <Optional />
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <SearchPicker
                        items={categories?.data ?? []}
                        value={categories?.data.find((c) => c.name === field.value)?.id ?? ''}
                        onChange={(id) => field.onChange(categories?.data.find((c) => c.id === id)?.name ?? '')}
                        getId={(category) => category.id}
                        getSearchText={(category) => category.name}
                        title="Select category"
                        placeholder={field.value || 'Select category'}
                        searchPlaceholder="Search categories"
                        emptyText="No categories"
                        className="flex-1"
                        renderValue={(category) => <span className="block truncate">{category.name}</span>}
                        renderItem={(category) => <span className="block truncate">{category.name}</span>}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 shrink-0"
                      onClick={() => setCategoryManagerOpen(true)}
                      title="Manage categories"
                      aria-label="Manage categories"
                    >
                      <Settings2 />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Barcode <Optional />
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        {...codeStep}
                        autoCapitalize="off"
                        className="h-10 flex-1 font-mono"
                        placeholder="Box barcode — scan or type"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0"
                      onClick={() => setScanBarcodeOpen(true)}
                      aria-label="Scan barcode with camera"
                    >
                      <Camera />
                      <span className="hidden sm:inline">Scan</span>
                    </Button>
                  </div>
                  <FormDescription>
                    Lets you add this product to orders and purchases by scanning the box.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Price & stock">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost price</FormLabel>
                    <FormControl>
                      <Input {...field} {...money} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wholesalePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wholesale price</FormLabel>
                    <FormControl>
                      <Input {...field} {...money} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current stock</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        {...step}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        disabled={isEdit || fromPurchase}
                      />
                    </FormControl>
                    {isEdit && <FormDescription>Change stock with a purchase or stock adjustment.</FormDescription>}
                    {fromPurchase && <FormDescription>Stock is added by this purchase.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <div className="flex h-10 rounded-md border border-border bg-muted/40 p-0.5">
                      {(['ACTIVE', 'INACTIVE'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.onChange(value)}
                          aria-pressed={field.value === value}
                          className={cn(
                            'flex-1 rounded text-[13px] font-medium transition-colors',
                            field.value === value
                              ? 'bg-card text-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {value === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </Section>

          <Section title="Serial numbers & warranty">
            <FormField
              control={form.control}
              name="trackSerials"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <FormLabel>Track serial numbers</FormLabel>
                    <FormDescription>
                      Scan each unit&apos;s serial when it arrives and when it&apos;s sold
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="warrantyMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Warranty months <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        {...step}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={240}
                        step={1}
                        placeholder="e.g. 12"
                      />
                    </FormControl>
                    {trackSerials && (
                      <FormDescription>Each sold unit&apos;s warranty runs from delivery.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warranty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Warranty text <Optional />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1 year" {...field} {...step} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          <Section title="Photos & description">
            <ProductImagesField
              productId={product?.id}
              images={product?.images ?? []}
              stagedFiles={stagedImageFiles}
              onStagedFilesChange={setStagedImageFiles}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <Optional />
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          {/* Rep Portal extras, folded away */}
          <section className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setPortalOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
              aria-expanded={portalOpen}
            >
              <span>
                <span className="block text-sm font-medium text-foreground">Rep Portal display</span>
                <span className="block text-xs text-muted-foreground">
                  Retail price, &quot;was&quot; price, featured
                </span>
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 text-muted-foreground transition-transform', portalOpen && 'rotate-180')}
              />
            </button>
            {portalOpen && (
              <div className="space-y-3 border-t border-border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="retailPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Retail price <Optional />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} {...money} />
                        </FormControl>
                        <FormDescription>Falls back to wholesale</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Compare-at <Optional />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} {...money} enterKeyHint="done" />
                        </FormControl>
                        <FormDescription>Struck-through &quot;was&quot; price</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-3">
                      <div className="min-w-0">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>Show in Rep Portal featured rails</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </section>

          {/* Pinned to the bottom on phones, so it stays above the keyboard. */}
          <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-5 flex-row border-t border-border bg-card px-5 py-3 sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:p-0">
            <Button type="button" variant="outline" className="h-11 flex-1 sm:h-9 sm:flex-none" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" className="h-11 flex-1 sm:h-9 sm:flex-none" loading={pending}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoryCreated={(category) => form.setValue('category', category.name, { shouldDirty: true })}
      />
      {scanBarcodeOpen && (
        <CameraScanDialog
          open={scanBarcodeOpen}
          onOpenChange={setScanBarcodeOpen}
          mode="single"
          title="Scan product barcode"
          description="Point the camera at the barcode on the box (not a unit's serial)."
          onDetect={(code) => form.setValue('barcode', code, { shouldDirty: true, shouldValidate: true })}
        />
      )}
    </>
  );
}
