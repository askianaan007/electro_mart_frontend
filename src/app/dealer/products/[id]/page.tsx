'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertTriangle, ArrowLeft, Minus, Package, Plus, ShieldCheck, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StockStatusBadge } from '@/components/status-badge';
import { QueryErrorState } from '@/components/query-error-state';
import { useProduct } from '@/hooks/use-products';
import { useCartStore } from '@/stores/cart-store';
import { cn, formatCurrency } from '@/lib/utils';

export default function DealerProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, isError, error, refetch } = useProduct(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="-ml-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft />
      Back
    </Button>
  );

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load this product" />
        </Card>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-20" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images.map((image) => image.url)
      : product.imageUrl
        ? [product.imageUrl]
        : [];
  const mainImage = galleryImages[activeImage] ?? galleryImages[0];

  const outOfStock = product.currentStock <= 0;
  const unavailable = outOfStock || product.status === 'INACTIVE';
  const status = outOfStock ? 'OUT_OF_STOCK' : 'IN_STOCK';

  function handleAdd() {
    addItem(product!.id, quantity);
    toast.success(`Added ${quantity} × ${product!.name} to cart`);
  }

  return (
    <div className="space-y-6">
      {backButton}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Card className="flex aspect-square items-center justify-center overflow-hidden bg-muted/50">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} width={480} height={480} className="size-full object-cover" />
            ) : (
              <Package className="size-16 text-muted-foreground/60" />
            )}
          </Card>
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {galleryImages.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1}`}
                  className={cn(
                    'size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors',
                    index === activeImage ? 'border-primary' : 'border-transparent hover:border-border',
                  )}
                >
                  <Image src={url} alt="" width={64} height={64} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{product.name}</h1>
              <StockStatusBadge status={status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {[product.brand, product.category, product.model].filter(Boolean).join(' · ')}
            </p>
          </div>

          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">Wholesale price</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                  {formatCurrency(product.wholesalePrice)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                <span className="font-medium text-foreground">{product.currentStock}</span> units available
              </p>
            </div>

            {product.status === 'INACTIVE' && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                This product is no longer available for order.
              </div>
            )}

            {!unavailable && (
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 items-center rounded-md border border-input bg-card shadow-xs dark:bg-muted/40">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="flex size-10 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="flex size-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => setQuantity((q) => Math.min(product.currentStock, q + 1))}
                    disabled={quantity >= product.currentStock}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <Button size="lg" className="flex-1" onClick={handleAdd}>
                  <ShoppingCart />
                  Add to Cart
                </Button>
              </div>
            )}
          </Card>

          {(product.description || product.warranty) && (
            <div className="space-y-3">
              {product.description && (
                <div className="space-y-1.5">
                  <h2 className="text-sm font-semibold text-foreground">Description</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                </div>
              )}
              {product.warranty && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 text-success" />
                  Warranty: <span className="text-foreground">{product.warranty}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
