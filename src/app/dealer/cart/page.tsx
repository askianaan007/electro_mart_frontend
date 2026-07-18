'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { useCartProducts } from '@/hooks/use-cart-products';
import { useCreateOrder } from '@/hooks/use-orders';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { useCartStore } from '@/stores/cart-store';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { rows, isLoading } = useCartProducts();
  const { data: dashboard } = useDealerDashboard();
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const createOrder = useCreateOrder();

  const subtotal = rows.reduce((sum, row) => sum + (row.product ? Number(row.product.wholesalePrice) * row.quantity : 0), 0);
  const unlimitedCredit = dashboard?.unlimitedCredit ?? false;
  const creditRemaining = dashboard ? Number(dashboard.creditRemaining) : undefined;
  const exceedsCredit = !unlimitedCredit && creditRemaining !== undefined && subtotal > creditRemaining;

  const hasUnavailableRows = rows.some(
    (row) => row.isError || (row.product && (row.product.status === 'INACTIVE' || row.quantity > row.product.currentStock)),
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
      <div>
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <p className="text-sm text-muted-foreground">Review items before submitting your order</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {rows.map((row) => {
              if (row.isError) {
                return (
                  <Card key={row.productId} className="border-destructive/40">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                        <Package className="size-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-destructive">No longer available</p>
                        <p className="text-sm text-muted-foreground">This product could not be found — remove it to continue.</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(row.productId)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              const inactive = row.product?.status === 'INACTIVE';
              const overStock = row.product ? row.quantity > row.product.currentStock : false;

              return (
                <Card key={row.productId} className={inactive || overStock ? 'border-warning/50' : undefined}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {row.product?.imageUrl ? (
                        <Image src={row.product.imageUrl} alt={row.product.name} width={64} height={64} className="size-full object-cover" />
                      ) : (
                        <Package className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{row.product?.name ?? 'Loading...'}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.product ? formatCurrency(row.product.wholesalePrice) : ''} each
                      </p>
                      {inactive && (
                        <p className="mt-1 text-xs font-medium text-warning-foreground">No longer available for order</p>
                      )}
                      {!inactive && overStock && (
                        <p className="mt-1 text-xs font-medium text-warning-foreground">
                          Only {row.product?.currentStock} in stock — reduce quantity
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-md border border-input">
                          <button
                            type="button"
                            className="flex size-7 items-center justify-center text-muted-foreground"
                            onClick={() => updateQuantity(row.productId, row.quantity - 1)}
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm">{row.quantity}</span>
                          <button
                            type="button"
                            className="flex size-7 items-center justify-center text-muted-foreground"
                            onClick={() => updateQuantity(row.productId, row.quantity + 1)}
                            disabled={row.product ? row.quantity >= row.product.currentStock : false}
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(row.productId)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      {row.product ? formatCurrency(Number(row.product.wholesalePrice) * row.quantity) : '—'}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Button variant="link" asChild className="px-0">
              <Link href="/dealer/products">Continue shopping</Link>
            </Button>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-semibold">
                <span>Estimated Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {unlimitedCredit ? (
                <p className="text-xs text-muted-foreground">Available credit: Unlimited</p>
              ) : (
                creditRemaining !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Available credit: {formatCurrency(creditRemaining)}
                  </p>
                )
              )}

              {exceedsCredit && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-warning-foreground" />
                  This order exceeds your available credit limit and may be blocked.
                </div>
              )}

              {hasUnavailableRows && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  Resolve the items above (remove unavailable products, reduce over-stock quantities) before submitting.
                </div>
              )}

              <Button
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
