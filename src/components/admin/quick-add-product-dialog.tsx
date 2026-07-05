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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryManagerDialog } from '@/components/admin/category-manager-dialog';
import { useAllCategories } from '@/hooks/use-categories';
import { useCreateProduct } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

const CREATE_NEW_CATEGORY = '__create_new__';

const schema = z.object({
  productCode: z.string().min(1, 'Product code is required'),
  name: z.string().min(1, 'Product name is required'),
  brand: z.string(),
  category: z.string(),
  costPrice: z.string().refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, 'Enter a valid cost'),
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Product) => void;
}) {
  const { data: categories } = useAllCategories();
  const createProduct = useCreateProduct();
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productCode: '', name: '', brand: '', category: '', costPrice: '' },
  });

  useEffect(() => {
    if (open) form.reset({ productCode: '', name: '', brand: '', category: '', costPrice: '' });
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    const costPrice = Number(values.costPrice);
    createProduct.mutate(
      {
        productCode: values.productCode,
        name: values.name,
        brand: values.brand || undefined,
        category: values.category || undefined,
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

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add a new product">
        <DialogHeader>
          <DialogTitle>Add a new product</DialogTitle>
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
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value === CREATE_NEW_CATEGORY) {
                          setCategoryManagerOpen(true);
                          return;
                        }
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.data.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={CREATE_NEW_CATEGORY} className="text-primary">
                          <Plus className="mr-1 inline size-3.5" />
                          Add new category
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createProduct.isPending}>
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
