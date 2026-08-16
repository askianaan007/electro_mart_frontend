'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Boxes, Minus, Package, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent title="Stock adjustment" className="sm:max-w-md rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none overflow-hidden">
        {/* Specular Shimmer Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:from-white/10" />

        <DialogHeader className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <SlidersHorizontal className="size-4.5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
              Stock Adjustment
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Record manual stock count corrections, damages, or incoming stock arrivals
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="relative z-10 space-y-4 pt-2">
            {/* Product Selector */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Target Product
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultProductId}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/60 backdrop-blur-md font-semibold text-xs sm:text-sm">
                        <SelectValue placeholder="Select a product from inventory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl border-border/60 shadow-xl max-h-60">
                      {products?.data.map((product) => (
                        <SelectItem key={product.id} value={product.id} className="rounded-xl text-xs font-medium py-2">
                          <span className="font-bold text-foreground">{product.name}</span>{' '}
                          <span className="text-muted-foreground font-mono text-[10px]">({product.productCode})</span>
                          <span className="ml-1.5 font-bold text-primary">— {product.currentStock} units</span>
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
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{selectedProduct.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">Current: {currentStock} units</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Stock</p>
                  <div className="flex items-center gap-1 font-extrabold text-xs">
                    <span className="text-muted-foreground">{currentStock}</span>
                    <span>→</span>
                    <span className={cn('font-black text-sm', direction === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
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
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Adjustment Direction
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/60 border border-border/60">
                    <button
                      type="button"
                      onClick={() => field.onChange('IN')}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all duration-200',
                        field.value === 'IN'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs scale-[1.02]'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <ArrowDownLeft className="size-4" />
                      <span>Stock In (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('OUT')}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all duration-200',
                        field.value === 'OUT'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs scale-[1.02]'
                          : 'text-muted-foreground hover:text-foreground'
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
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Adjustment Quantity
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter quantity"
                      {...field}
                      className="h-11 rounded-2xl border-border/60 bg-background/60 backdrop-blur-md font-extrabold text-sm"
                    />
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
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Reason / Note
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Stock count audit correction, damage discard..."
                      {...field}
                      className="h-11 rounded-2xl border-border/60 bg-background/60 backdrop-blur-md text-xs sm:text-sm font-medium"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-2xl font-semibold backdrop-blur-md h-11 sm:h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={adjustStock.isPending}
                className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all h-11 sm:h-10"
              >
                Save Adjustment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
