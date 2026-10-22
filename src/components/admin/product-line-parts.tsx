import type { Product } from '@/lib/api/types';
import { serialKey } from '@/lib/serial';
import { cn, formatCurrency } from '@/lib/utils';

// Shared by the order and purchase forms: product search, scan lookup and list rows.

export function productSearchText(product: Product) {
  return [product.name, product.productCode, product.brand, product.model, product.sku, product.barcode]
    .filter(Boolean)
    .join(' ');
}

/** Product whose barcode / SKU / code equals a scanned value. */
export function productForCode(products: Product[], code: string) {
  const key = serialKey(code);
  return products.find((p) => [p.barcode, p.sku, p.productCode].some((v) => v && serialKey(v) === key));
}

/** One product in a picker list: name, code, stock and the price that matters on this screen. */
export function ProductPickerRow({ product, price }: { product: Product; price: string | number | undefined }) {
  return (
    <>
      <span className="line-clamp-2 font-medium">{product.name}</span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="font-mono">{product.productCode}</span>
        <span
          className={cn('tabular-nums', product.currentStock <= 0 ? 'font-medium text-destructive' : 'text-success')}
        >
          {product.currentStock <= 0 ? 'Out of stock' : `${product.currentStock} in stock`}
        </span>
        {price !== undefined && <span className="tabular-nums">{formatCurrency(price)}</span>}
      </span>
    </>
  );
}
