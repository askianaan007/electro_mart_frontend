'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Barcode, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SectionHeader } from '@/components/section-header';
import { QueryErrorState } from '@/components/query-error-state';
import { TableSkeleton } from '@/components/loading-state';
import { SerialScanInput, type SerialScanState } from '@/components/scan/serial-scan-input';
import { UnitStatusBadge } from '@/components/scan/unit-status-badge';
import { useAssignOrderUnits, useOrderUnits } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import type { OrderStatus, OrderUnitLine } from '@/lib/api/types';
import { newIdempotencyKey } from '@/lib/serial';
import { formatDate } from '@/lib/utils';

const ASSIGNABLE: OrderStatus[] = ['APPROVED', 'PACKED', 'DELIVERED', 'COMPLETED'];

/** Serial numbers per order line — scanned when the goods are packed. */
export function OrderSerialsCard({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { data: lines, isLoading, isError, error, refetch } = useOrderUnits(orderId);
  const [editing, setEditing] = useState<OrderUnitLine | null>(null);

  const tracked = (lines ?? []).filter((line) => line.product.trackSerials || line.assigned.length > 0);
  if (!isLoading && !isError && tracked.length === 0) return null;
  const canEdit = ASSIGNABLE.includes(status);
  const missing = tracked.reduce((sum, line) => sum + Math.max(0, line.required - line.assigned.length), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title="Serial numbers"
        className="pb-4"
        actions={
          tracked.length > 0 ? (
            missing > 0 ? (
              <Badge variant="warning">{missing} still to scan</Badge>
            ) : (
              <Badge variant="success">All scanned</Badge>
            )
          ) : undefined
        }
      />
      <div className="border-t border-border">
        {isLoading ? (
          <TableSkeleton rows={2} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <ul className="divide-y divide-border">
            {tracked.map((line) => (
              <li key={line.productId} className="space-y-2 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{line.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.assigned.length} / {line.required} scanned
                      {line.returnedQty > 0 && ` · ${line.returnedQty} returned`}
                      {line.product.warrantyMonths ? ` · ${line.product.warrantyMonths} months warranty` : ''}
                    </p>
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(line)}>
                      <ScanLine />
                      {line.assigned.length === 0 ? 'Scan serials' : 'Edit serials'}
                    </Button>
                  )}
                </div>
                {line.assigned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {line.assigned.map((unit) => (
                      <Link
                        key={unit.id}
                        href={`/admin/units/${unit.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs hover:border-primary/40 hover:bg-primary/5"
                        title={
                          unit.warrantyExpiresAt ? `Warranty until ${formatDate(unit.warrantyExpiresAt)}` : undefined
                        }
                      >
                        <Barcode className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-foreground">{unit.serialNumber}</span>
                        <UnitStatusBadge status={unit.status} condition={unit.condition} />
                        {unit.replacesSerial && (
                          <span className="text-muted-foreground">replaces {unit.replacesSerial}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <OrderLineSerialsDialog
          orderId={orderId}
          line={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  );
}

function OrderLineSerialsDialog({
  orderId,
  line,
  open,
  onOpenChange,
}: {
  orderId: string;
  line: OrderUnitLine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Scan order serials" className="sm:max-w-lg">
        {/* Content unmounts while closed, so each opening starts from what is assigned now. */}
        <OrderLineSerialsBody orderId={orderId} line={line} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function OrderLineSerialsBody({ orderId, line, close }: { orderId: string; line: OrderUnitLine; close: () => void }) {
  const [serials, setSerials] = useState<string[]>(() => line.assigned.map((u) => u.serialNumber));
  const [scan, setScan] = useState<SerialScanState>({ ok: true, pending: false, problems: [] });
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const assign = useAssignOrderUnits(orderId);

  const removed = line.assigned.filter(
    (u) =>
      !serials.some((s) => s.replace(/\s+/g, '').toUpperCase() === u.serialNumber.replace(/\s+/g, '').toUpperCase()),
  );

  function save() {
    assign.mutate(
      { lines: [{ productId: line.productId, serials }], idempotencyKey },
      {
        onSuccess: (result) => {
          const parts = [
            result.added && `${result.added} added`,
            result.removed && `${result.removed} removed`,
            result.registered && `${result.registered} newly registered`,
          ].filter(Boolean);
          toast.success(parts.length ? `Serials saved — ${parts.join(', ')}` : 'No changes');
          close();
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
      <DialogHeader>
        <DialogTitle>Serials — {line.product.name}</DialogTitle>
        <DialogDescription>
          Scan each unit going to the customer. {line.required} unit(s) on this line. Serials not registered yet are
          added as existing stock.
        </DialogDescription>
      </DialogHeader>

      <SerialScanInput
        productId={line.productId}
        context="ASSIGN"
        orderId={orderId}
        value={serials}
        onChange={setSerials}
        max={line.required}
        autoFocus
        onStateChange={setScan}
      />

      {removed.length > 0 && (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-foreground">
          Saving takes {removed.map((u) => u.serialNumber).join(', ')} off this order and puts{' '}
          {removed.length === 1 ? 'it' : 'them'} back in stock.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button type="button" onClick={save} loading={assign.isPending} disabled={!scan.ok || scan.pending}>
          Save serials
        </Button>
      </DialogFooter>
    </>
  );
}
