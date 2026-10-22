'use client';

import type React from 'react';
import { useMemo } from 'react';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { useSerialCoverage } from '@/hooks/use-product-units';

/**
 * Serials leaving with a supplier return or a write-off. Units without a
 * serial can go without one; once the shelf has no unserialized units left
 * the server needs to know exactly which serials left — `min` mirrors that.
 */
export function useStockOutSerialRule(productId: string | undefined, quantity: number, enabled: boolean) {
  const { data } = useSerialCoverage(productId, enabled && !!productId);
  const row = data?.find((r) => r.id === productId);
  if (!row) return null;
  // Taking q units off the shelf with p of them scanned leaves gap − q + p;
  // the server refuses a negative gap, so p ≥ q − gap.
  return { row, min: Math.max(0, quantity - Math.max(0, row.gap)) };
}

export function StockOutSerialsField({
  productId,
  context,
  purchaseId,
  quantity,
  value,
  onChange,
  onStateChange,
  editingSerials,
  min,
  label = 'Serials leaving',
}: {
  productId: string;
  context: 'PURCHASE_RETURN' | 'WRITE_OFF';
  purchaseId?: string;
  quantity: number;
  value: string[];
  onChange: (next: string[]) => void;
  onStateChange: (state: SerialScanState) => void;
  editingSerials?: string[];
  min: number | null;
  label?: string;
}) {
  const accepted = useMemo(
    () => (editingSerials?.length ? { serials: editingSerials, message: 'On this return' } : undefined),
    [editingSerials],
  );
  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">
          {min && min > 0 ? `Scan at least ${min} — no unserialized units left to cover them` : 'Optional'}
        </p>
      </div>
      <SerialScanInput
        productId={productId}
        context={context}
        purchaseId={purchaseId}
        value={value}
        onChange={onChange}
        max={quantity || undefined}
        accepted={accepted}
        onStateChange={onStateChange}
      />
    </div>
  );
}

/** Field plus its live minimum (from the product's shelf coverage). */
export function StockOutSerialsForProduct(props: Omit<React.ComponentProps<typeof StockOutSerialsField>, 'min'>) {
  // While editing, the record's own serials are counted differently server-side — show no minimum.
  const rule = useStockOutSerialRule(props.productId, props.quantity, !props.editingSerials?.length);
  return <StockOutSerialsField {...props} min={rule?.min ?? null} />;
}
