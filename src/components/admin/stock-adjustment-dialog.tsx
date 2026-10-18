'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdjustStock } from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import { cn } from '@/lib/utils';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  direction: z.enum(['IN', 'OUT']),
  quantity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Enter a whole number of at least 1'),
  reason: z.string().trim().min(1, 'Reason is required'),
});

type FormValues = z.infer<typeof schema>;

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  defaultProductId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProductId?: string;
}) {
  const { data: products } = useProducts({ limit: 100, status: 'ACTIVE' });
  const adjustStock = useAdjustStock();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: defaultProductId ?? '', direction: 'IN', quantity: '1', reason: '' },
  });

  const selectedProductId = form.watch('productId');
  const direction = form.watch('direction');
  const quantityStr = form.watch('quantity');

  useEffect(() => {
    if (open) form.reset({ productId: defaultProductId ?? '', direction: 'IN', quantity: '1', reason: '' });
  }, [open, defaultProductId, form]);

  const onSubmit = form.handleSubmit((values) => {
    adjustStock.mutate(
      {
        productId: values.productId,
        direction: values.direction,
        quantity: Number(values.quantity),
        reason: values.reason,
      },
      {
        onSuccess: () => {
          toast.success('Stock adjustment saved successfully');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  const selectedProduct = products?.data.find((p) => p.id === selectedProductId);
  const qtyNumber = Number.isInteger(Number(quantityStr)) && Number(quantityStr) >= 1 ? Number(quantityStr) : 0;
  const currentStock = selectedProduct?.currentStock ?? 0;
  const projectedStock = direction === 'IN' ? currentStock + qtyNumber : Math.max(0, currentStock - qtyNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Stock adjustment" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Record manual stock count corrections, damages, or incoming stock arrivals
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Product Selector */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Product</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultProductId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product from inventory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60" searchable searchPlaceholder="Search products…">
                      {products?.data.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <span className="font-medium text-foreground">{product.name}</span>{' '}
                          <span className="font-mono text-xs text-muted-foreground">({product.productCode})</span>
                          <span className="ml-1.5 tabular-nums text-muted-foreground">— {product.currentStock} units</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Product Context Banner */}
            {selectedProduct && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="size-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{selectedProduct.name}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">Current: {currentStock} units</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">New Stock</p>
                  <div className="flex items-center justify-end gap-1 text-sm tabular-nums">
                    <span className="text-muted-foreground">{currentStock}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={cn('font-semibold', direction === 'IN' ? 'text-success' : 'text-destructive')}>
                      {projectedStock} units
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Segmented Direction Toggle */}
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Direction</FormLabel>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1">
                    <button
                      type="button"
                      onClick={() => field.onChange('IN')}
                      aria-pressed={field.value === 'IN'}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
                        field.value === 'IN'
                          ? 'bg-card text-success shadow-xs ring-1 ring-success/25'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <ArrowDownLeft className="size-4" />
                      <span>Stock In (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('OUT')}
                      aria-pressed={field.value === 'OUT'}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors',
                        field.value === 'OUT'
                          ? 'bg-card text-destructive shadow-xs ring-1 ring-destructive/25'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <ArrowUpRight className="size-4" />
                      <span>Stock Out (-)</span>
                    </button>
                  </div>
                </FormItem>
              )}
            />

            {/* Quantity Input */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="Enter quantity" {...field} className="tabular-nums" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Input */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason / Note</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Stock count audit correction, damage discard..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={adjustStock.isPending}>
                Save Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
