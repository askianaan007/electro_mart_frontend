'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Minus, Package, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StockStatusBadge } from '@/components/status-badge';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/lib/api/types';

function stockStatus(product: Product): 'IN_STOCK' | 'OUT_OF_STOCK' {
  return product.currentStock <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';
}

export function ProductCard({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const outOfStock = product.currentStock <= 0;

  function handleAdd() {
    addItem(product.id, quantity);
    toast.success(`Added ${quantity} × ${product.name} to cart`);
    setQuantity(1);
  }

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-sm">
      <Link
        href={`/dealer/products/${product.id}`}
        className="relative flex aspect-square items-center justify-center border-b border-border bg-muted/50"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={200}
            height={200}
            className="size-full object-cover"
          />
        ) : (
          <Package className="size-10 text-muted-foreground/60" />
        )}
        <div className="absolute left-2 top-2">
          <StockStatusBadge status={stockStatus(product)} />
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-3 p-3 sm:p-3">
        <Link href={`/dealer/products/${product.id}`} className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">{product.name}</p>
          <p className="truncate text-xs text-muted-foreground">{product.category ?? product.brand ?? ''}</p>
        </Link>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatCurrency(product.wholesalePrice)}
            </p>
            <p className="text-xs text-muted-foreground">Wholesale price</p>
          </div>
          {!outOfStock && (
            <p className="text-xs text-muted-foreground tabular-nums">{product.currentStock} available</p>
          )}
        </div>

        {!outOfStock && (
          <div className="mt-auto flex items-center gap-2">
            <div className="flex h-8 items-center rounded-md border border-input bg-card shadow-xs dark:bg-muted/40">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="flex size-8 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-medium tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="flex size-8 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(product.currentStock, q + 1))}
                disabled={quantity >= product.currentStock}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <Button size="sm" className="flex-1" onClick={handleAdd}>
              <ShoppingCart />
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
