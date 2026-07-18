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

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  if (isLoading || !product) {
    return <Skeleton className="h-96 w-full" />;
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
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Card className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} width={480} height={480} className="size-full object-cover" />
            ) : (
              <Package className="size-16 text-muted-foreground" />
            )}
          </Card>
          {galleryImages.length > 1 && (
            <div className="flex gap-2">
              {galleryImages.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'size-16 shrink-0 overflow-hidden rounded-md border-2 bg-muted',
                    index === activeImage ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <Image src={url} alt="" width={64} height={64} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[product.brand, product.category, product.model].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold">{formatCurrency(product.wholesalePrice)}</span>
            <StockStatusBadge status={status} />
          </div>

          {product.description && <p className="text-sm text-muted-foreground">{product.description}</p>}

          {product.warranty && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4" />
              Warranty: {product.warranty}
            </div>
          )}

          <p className="text-sm text-muted-foreground">{product.currentStock} units available</p>

          {product.status === 'INACTIVE' && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              This product is no longer available for order.
            </div>
          )}

          {!unavailable && (
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center rounded-md border border-input">
                <button
                  type="button"
                  className="flex size-10 items-center justify-center text-muted-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center">{quantity}</span>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center text-muted-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.min(product.currentStock, q + 1))}
                  disabled={quantity >= product.currentStock}
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <Button className="flex-1" onClick={handleAdd}>
                <ShoppingCart />
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
