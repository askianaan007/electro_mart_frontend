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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllSuppliers } from '@/hooks/use-suppliers';
import { useProducts } from '@/hooks/use-products';
import { useCreatePurchase } from '@/hooks/use-purchases';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity: z.string().refine((v) => Number(v) >= 1, 'Min 1'),
  unitCost: z.string().refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Invalid cost'),
});

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  invoiceNumber: z.string().min(1, "Supplier's invoice number is required"),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

type FormValues = z.infer<typeof schema>;

function LineTotal({ control, index }: { control: ReturnType<typeof useForm<FormValues>>['control']; index: number }) {
  const quantity = useWatch({ control, name: `items.${index}.quantity` });
  const unitCost = useWatch({ control, name: `items.${index}.unitCost` });
  const total = (Number(quantity) || 0) * (Number(unitCost) || 0);
  return <span className="font-medium">{formatCurrency(total)}</span>;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const { data: suppliers } = useAllSuppliers();
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const createPurchase = useCreatePurchase();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: '', quantity: '1', unitCost: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const grandTotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );

  const onSubmit = form.handleSubmit((values) => {
    createPurchase.mutate(
      {
        supplierId: values.supplierId,
        invoiceNumber: values.invoiceNumber,
        purchaseDate: values.purchaseDate,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      },
      {
        onSuccess: (purchase) => {
          toast.success('Purchase recorded — stock updated');
          router.push(`/admin/purchases/${purchase.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Record a purchase</h1>
        <p className="text-sm text-muted-foreground">Logging a purchase increases stock immediately</p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.data.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier invoice number</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Purchase date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Line items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '1', unitCost: '0' })}
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
                      <TableHead>Unit Cost</TableHead>
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
                                      {product.name}
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
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitCost`}
                            render={({ field }) => (
                              <Input type="number" min={0} step="0.01" className="w-28" {...field} />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <LineTotal control={form.control} index={index} />
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
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
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
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitCost`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit cost</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} step="0.01" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Line total</span>
                      <LineTotal control={form.control} index={index} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Purchase Value</p>
                  <p className="text-xl font-semibold">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={createPurchase.isPending}>
              Save Purchase
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
