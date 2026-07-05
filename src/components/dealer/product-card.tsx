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
    <Card className="flex flex-col overflow-hidden">
      <Link href={`/dealer/products/${product.id}`} className="flex aspect-square items-center justify-center bg-muted">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} width={200} height={200} className="size-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground" />
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/dealer/products/${product.id}`} className="min-w-0">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="truncate text-xs text-muted-foreground">{product.category ?? product.brand ?? ''}</p>
        </Link>
        <div className="flex items-center justify-between">
          <span className="font-semibold">{formatCurrency(product.wholesalePrice)}</span>
          <StockStatusBadge status={stockStatus(product)} />
        </div>

        {!outOfStock && (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <div className="flex items-center rounded-md border border-input">
              <button
                type="button"
                className="flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-6 text-center text-sm">{quantity}</span>
              <button
                type="button"
                className="flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
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
