'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { useCartProducts } from '@/hooks/use-cart-products';
import { useCreateOrder } from '@/hooks/use-orders';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { useCartStore } from '@/stores/cart-store';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { rows, isLoading } = useCartProducts();
  const { data: dashboard } = useDealerDashboard();
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const createOrder = useCreateOrder();

  const subtotal = rows.reduce(
    (sum, row) => sum + (row.product ? Number(row.product.wholesalePrice) * row.quantity : 0),
    0,
  );
  const unlimitedCredit = dashboard?.unlimitedCredit ?? false;
  const creditRemaining = dashboard ? Number(dashboard.creditRemaining) : undefined;
  const exceedsCredit = !unlimitedCredit && creditRemaining !== undefined && subtotal > creditRemaining;

  const hasUnavailableRows = rows.some(
    (row) =>
      row.isError || (row.product && (row.product.status === 'INACTIVE' || row.quantity > row.product.currentStock)),
  );

  function handleSubmit() {
    createOrder.mutate(
      { items: rows.map((row) => ({ productId: row.productId, quantity: row.quantity })) },
      {
        onSuccess: (order) => {
          clear();
          router.push(`/dealer/orders/confirmation/${order.id}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Your Cart" description="Review items and quantities before submitting your order." />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
                <Skeleton className="size-16 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-7 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse products and add items to get started"
            action={
              <Button asChild>
                <Link href="/dealer/products">Browse Products</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <SectionHeader
                title="Items"
                description={`${rows.length} ${rows.length === 1 ? 'product' : 'products'} in your cart`}
                className="pb-3"
              />
              <ul className="divide-y divide-border border-t border-border">
                {rows.map((row) => {
                  if (row.isError) {
                    return (
                      <li key={row.productId} className="flex items-center gap-3 bg-destructive/5 p-4">
                        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                          <Package className="size-6 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-destructive">No longer available</p>
                          <p className="text-sm text-muted-foreground">
                            This product could not be found — remove it to continue.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove item"
                          onClick={() => removeItem(row.productId)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </li>
                    );
                  }

                  const inactive = row.product?.status === 'INACTIVE';
                  const overStock = row.product ? row.quantity > row.product.currentStock : false;

                  return (
                    <li
                      key={row.productId}
                      className={cn('flex items-start gap-3 p-4', (inactive || overStock) && 'bg-warning/5')}
                    >
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/50">
                        {row.product?.imageUrl ? (
                          <Image
                            src={row.product.imageUrl}
                            alt={row.product.name}
                            width={64}
                            height={64}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Package className="size-6 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.product?.name ?? 'Loading...'}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {row.product ? formatCurrency(row.product.wholesalePrice) : ''} each
                            </p>
                          </div>
                          <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                            {row.product ? formatCurrency(Number(row.product.wholesalePrice) * row.quantity) : '—'}
                          </div>
                        </div>
                        {inactive && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                            <AlertTriangle className="size-3.5" />
                            No longer available for order
                          </p>
                        )}
                        {!inactive && overStock && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning-foreground dark:text-warning">
                            <AlertTriangle className="size-3.5" />
                            Only {row.product?.currentStock} in stock — reduce quantity
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex h-8 items-center rounded-md border border-input bg-card shadow-xs dark:bg-muted/40">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              className="flex size-8 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              onClick={() => updateQuantity(row.productId, row.quantity - 1)}
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium tabular-nums">{row.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              className="flex size-8 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                              onClick={() => updateQuantity(row.productId, row.quantity + 1)}
                              disabled={row.product ? row.quantity >= row.product.currentStock : false}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Remove item"
                            onClick={() => removeItem(row.productId)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Button variant="link" asChild className="px-0">
              <Link href="/dealer/products">
                <ArrowLeft />
                Continue shopping
              </Link>
            </Button>
          </div>

          <Card className="lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums text-foreground">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <dt>Estimated Total</dt>
                  <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
                </div>
              </dl>

              {unlimitedCredit ? (
                <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Available credit</span>
                  <span className="font-medium text-foreground">Unlimited</span>
                </div>
              ) : (
                creditRemaining !== undefined && (
                  <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Available credit</span>
                    <span className="font-medium tabular-nums text-foreground">{formatCurrency(creditRemaining)}</span>
                  </div>
                )
              )}

              {exceedsCredit && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning-foreground dark:text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  This order exceeds your available credit limit and may be blocked.
                </div>
              )}

              {hasUnavailableRows && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Resolve the items above (remove unavailable products, reduce over-stock quantities) before submitting.
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                loading={createOrder.isPending}
                disabled={hasUnavailableRows}
              >
                Submit Order
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
