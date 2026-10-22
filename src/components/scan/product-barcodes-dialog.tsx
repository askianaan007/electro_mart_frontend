'use client';

import { useState } from 'react';
import { Check, PackageOpen, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { useRegisterUnits, useUnlabelledStock } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import { newIdempotencyKey } from '@/lib/serial';
import { cn, formatDate } from '@/lib/utils';
import type { UnlabelledStock } from '@/lib/api/types';

type Product = { id: string; name: string };

/**
 * Register barcodes for pieces bought without them. Each barcode is tied to
 * the purchase it came from, so warranty claims still know the supplier.
 * Never changes stock.
 */
export function ProductBarcodesDialog({
  product,
  onOpenChange,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent title="Add barcodes" mobileFullScreen className="sm:max-w-lg">
        {product && <ProductBarcodesBody product={product} close={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

const SHELF = 'shelf';

function ProductBarcodesBody({ product, close }: { product: Product; close: () => void }) {
  const { data, isLoading } = useUnlabelledStock(product.id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add barcodes</DialogTitle>
        <DialogDescription className="break-words">{product.name}</DialogDescription>
      </DialogHeader>
      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <BarcodesForm key={data.missing} stock={data} close={close} />
      )}
    </>
  );
}

function BarcodesForm({ stock, close }: { stock: UnlabelledStock; close: () => void }) {
  const purchaseRoom = stock.purchases.reduce((sum, p) => sum + p.room, 0);
  // Pieces that predate any recorded purchase (opening stock) can only go on the shelf.
  const showShelf = stock.missing > purchaseRoom || stock.purchases.length === 0;
  const [source, setSource] = useState(stock.purchases[0]?.id ?? SHELF);
  const [serials, setSerials] = useState<string[]>([]);
  const [scan, setScan] = useState<SerialScanState>({ ok: true, pending: false, problems: [] });
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  // Phones: don't pop the keyboard over the list — the camera button is right there.
  const [autoFocus] = useState(() => window.matchMedia('(pointer: fine)').matches);
  const register = useRegisterUnits();

  const purchase = stock.purchases.find((p) => p.id === source);
  const max = Math.min(purchase ? purchase.room : stock.missing, stock.missing);

  if (stock.missing === 0) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-8 text-center">
          <Check className="size-8 text-success" />
          <p className="font-medium text-foreground">Every piece in stock has a barcode</p>
        </div>
        <DialogFooter>
          <Button type="button" onClick={close}>
            Done
          </Button>
        </DialogFooter>
      </>
    );
  }

  function save() {
    register.mutate(
      { productId: stock.productId, serials, purchaseId: purchase?.id, idempotencyKey },
      {
        onSuccess: (result) => {
          toast.success(`${result.registered} barcode(s) registered`);
          // The refetch remounts this form with the new count; close only when nothing is left.
          if (result.registered >= stock.missing) close();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  }

  return (
    <>
      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{stock.missing}</p>
        <p className="text-sm text-muted-foreground">
          piece{stock.missing === 1 ? '' : 's'} without a barcode · {stock.currentStock} in stock
        </p>
      </div>

      {(stock.purchases.length > 1 || (stock.purchases.length > 0 && showShelf)) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Which purchase are they from?</p>
          <div className="space-y-2" role="radiogroup">
            {stock.purchases.map((p) => (
              <SourceOption
                key={p.id}
                selected={source === p.id}
                onSelect={() => setSource(p.id)}
                icon={Truck}
                title={p.supplierName}
                detail={`${p.invoiceNumber} · ${formatDate(p.purchaseDate)}`}
                count={Math.min(p.room, stock.missing)}
              />
            ))}
            {showShelf && (
              <SourceOption
                selected={source === SHELF}
                onSelect={() => setSource(SHELF)}
                icon={PackageOpen}
                title="Older stock"
                detail="Already on the shelf, no purchase recorded"
                count={stock.missing}
              />
            )}
          </div>
        </div>
      )}
      {stock.purchases.length === 1 && !showShelf && purchase && (
        <p className="text-sm text-muted-foreground">
          From {purchase.supplierName} · {purchase.invoiceNumber} · {formatDate(purchase.purchaseDate)}
        </p>
      )}

      <SerialScanInput
        key={source}
        productId={stock.productId}
        context="RECEIVE"
        purchaseId={purchase?.id}
        value={serials}
        onChange={setSerials}
        max={max}
        autoFocus={autoFocus}
        onStateChange={setScan}
        placeholder="Scan or type a barcode, then Enter"
      />

      <DialogFooter className="sticky bottom-0 z-10 -mx-5 -mb-5 flex-row border-t border-border bg-card px-5 py-3 sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:p-0">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1 sm:flex-none"
          onClick={save}
          loading={register.isPending}
          disabled={serials.length === 0 || !scan.ok || scan.pending}
        >
          Save {serials.length || ''} barcode{serials.length === 1 ? '' : 's'}
        </Button>
      </DialogFooter>
    </>
  );
}

function SourceOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  detail,
  count,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof Truck;
  title: string;
  detail: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50',
      )}
    >
      <Icon className={cn('size-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{count} to scan</span>
    </button>
  );
}
