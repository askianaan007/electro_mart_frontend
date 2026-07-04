'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProduct, useUpdateProduct } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

const numberField = (label: string) =>
  z.string().refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, `${label} must be a valid number`);

const schema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  sku: z.string(),
  barcode: z.string(),
  name: z.string().min(1, 'Product name is required'),
  brand: z.string(),
  category: z.string(),
  model: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  costPrice: numberField('Cost price'),
  wholesalePrice: numberField('Wholesale price'),
  sellingPrice: numberField('Selling price'),
  currentStock: numberField('Current stock'),
  minimumStock: numberField('Minimum stock'),
  warranty: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormValues = z.infer<typeof schema>;

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
    imageUrl: product?.imageUrl ?? '',
    costPrice: product?.costPrice ?? '',
    wholesalePrice: product?.wholesalePrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
    currentStock: product ? String(product.currentStock) : '0',
    minimumStock: product ? String(product.minimumStock) : '0',
    warranty: product?.warranty ?? '',
    status: product?.status ?? 'ACTIVE',
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}) {
  const isEdit = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');
  const pending = createProduct.isPending || updateProduct.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(product),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(product));
  }, [open, product, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload: Record<string, unknown> = {
      productCode: values.productCode,
      sku: values.sku || undefined,
      barcode: values.barcode || undefined,
      name: values.name,
      brand: values.brand || undefined,
      category: values.category || undefined,
      model: values.model || undefined,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      costPrice: Number(values.costPrice),
      wholesalePrice: Number(values.wholesalePrice),
      sellingPrice: Number(values.sellingPrice),
      minimumStock: Number(values.minimumStock),
      warranty: values.warranty || undefined,
      status: values.status,
    };

    if (isEdit) {
      updateProduct.mutate(payload, {
        onSuccess: () => {
          toast.success('Product updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      payload.currentStock = Number(values.currentStock);
      createProduct.mutate(payload, {
        onSuccess: () => {
          toast.success('Product created');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit product' : 'Add product'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit product' : 'Add a new product'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Barcode (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Brand (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="TV, Refrigerator, AC..." {...field} />
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
                    <FormLabel>Model (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warranty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="1 year" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost price</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
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
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling price</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current stock</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} disabled={isEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum stock</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Create product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
