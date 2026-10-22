'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchPicker } from '@/components/search-picker';
import { CategoryManagerDialog } from '@/components/admin/category-manager-dialog';
import { useAllCategories } from '@/hooks/use-categories';
import { useCreateProduct } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

const schema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  name: z.string().min(1, 'Product name is required'),
  brand: z.string(),
  category: z.string(),
  barcode: z.string(),
  costPrice: z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, 'Enter a valid cost'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Minimal product creation used from the Record Purchase flow, when the
 * product you're buying doesn't exist in the catalog yet. Wholesale price
 * isn't known at purchase time — it defaults to cost price and can be set
 * properly later from the Products page.
 */
export function QuickAddProductDialog({
  open,
  onOpenChange,
  onCreated,
  initialBarcode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Product) => void;
  /** A scanned code that matched no product — saved as the new product's barcode. */
  initialBarcode?: string;
}) {
  const { data: categories } = useAllCategories();
  const createProduct = useCreateProduct();
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productCode: '', name: '', brand: '', category: '', barcode: '', costPrice: '' },
  });

  useEffect(() => {
    if (open)
      form.reset({ productCode: '', name: '', brand: '', category: '', barcode: initialBarcode ?? '', costPrice: '' });
  }, [open, form, initialBarcode]);

  const onSubmit = form.handleSubmit((values) => {
    const costPrice = Number(values.costPrice);
    createProduct.mutate(
      {
        productCode: values.productCode,
        name: values.name,
        brand: values.brand || undefined,
        category: values.category || undefined,
        barcode: values.barcode.trim() || undefined,
        costPrice,
        wholesalePrice: costPrice,
        currentStock: 0,
      },
      {
        onSuccess: (product) => {
          toast.success('Product created — set its wholesale price on the Products page when ready');
          onCreated(product as Product);
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  // Phone keyboards: "Next" jumps to the following box; the last one submits.
  function nextOnEnter(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    const boxes = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[data-step]'));
    const index = boxes.indexOf(event.target);
    if (index >= 0 && index < boxes.length - 1) {
      event.preventDefault();
      boxes[index + 1].focus();
    }
  }

  const textProps = { 'data-step': '', enterKeyHint: 'next' as const, autoComplete: 'off', className: 'h-10' };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title="Add a new product" mobileFullScreen className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add a new product</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} onKeyDown={nextOnEnter} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Product name</FormLabel>
                      <FormControl>
                        <Input {...field} {...textProps} autoCapitalize="words" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product code</FormLabel>
                      <FormControl>
                        <Input {...field} {...textProps} autoCapitalize="characters" spellCheck={false} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost price</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" min={0} step="0.01" {...field} {...textProps} />
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
                        Brand <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} {...textProps} autoCapitalize="words" />
                      </FormControl>
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
                        Barcode <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          {...textProps}
                          enterKeyHint="done"
                          className="h-10 font-mono"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Box barcode, to add it by scanning"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        Category <span className="font-normal text-muted-foreground">(optional)</span>
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
                            placeholder="Select category"
                            searchPlaceholder="Search categories"
                            emptyText="No categories — use New"
                            className="flex-1"
                            renderValue={(category) => <span className="block truncate">{category.name}</span>}
                            renderItem={(category) => <span className="block truncate">{category.name}</span>}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 shrink-0"
                          onClick={() => setCategoryManagerOpen(true)}
                        >
                          <Plus />
                          New
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Pinned to the bottom of the screen on phones, so it stays above the keyboard. */}
              <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 flex-row border-t border-border bg-card px-5 py-3 sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:p-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 sm:h-9 sm:flex-none"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-11 flex-1 sm:h-9 sm:flex-none" loading={createProduct.isPending}>
                  Create product
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onCategoryCreated={(category) => {
          form.setValue('category', category.name);
          setCategoryManagerOpen(false);
        }}
      />
    </>
  );
}
