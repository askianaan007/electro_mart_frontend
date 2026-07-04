'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Minus, Package, Plus, ShieldCheck, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StockStatusBadge } from '@/components/status-badge';
import { useProduct } from '@/hooks/use-products';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils';

export default function DealerProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading } = useProduct(id);

  if (isLoading || !product) {
    return <Skeleton className="h-96 w-full" />;
  }

  const outOfStock = product.currentStock <= 0;
  const status = outOfStock ? 'OUT_OF_STOCK' : product.isLowStock ? 'LOW_STOCK' : 'IN_STOCK';

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
        <Card className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} width={480} height={480} className="size-full object-cover" />
          ) : (
            <Package className="size-16 text-muted-foreground" />
          )}
        </Card>

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

          {!outOfStock && (
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
