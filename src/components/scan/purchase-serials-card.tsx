'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Barcode, ScanLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterSerialsDialog } from '@/components/scan/register-serials-dialog';
import { UnitStatusBadge } from '@/components/scan/unit-status-badge';
import type { Purchase, PurchaseReturn } from '@/lib/api/types';

/** Serials registered against a purchase, per product, with "scan later". */
export function PurchaseSerialsCard({ purchase, returns }: { purchase: Purchase; returns: PurchaseReturn[] }) {
  const [adding, setAdding] = useState<{ productId: string; name: string; room: number } | null>(null);

  const productIds = [...new Set(purchase.items.map((i) => i.productId))];
  const lines = productIds
    .map((productId) => {
      const items = purchase.items.filter((i) => i.productId === productId);
      const product = items[0]?.product;
      const units = (purchase.units ?? []).filter((u) => u.productId === productId);
      const quantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const returnedQty = returns
        .flatMap((r) => r.items)
        .filter((i) => i.productId === productId)
        .reduce((sum, i) => sum + i.quantity, 0);
      const returnedWithSerial = units.filter((u) => u.status === 'RETURNED_TO_SUPPLIER').length;
      // Same as the server: units returned without a serial no longer need one.
      const room = Math.max(0, quantity - units.length - Math.max(0, returnedQty - returnedWithSerial));
      return { productId, name: product?.name ?? productId, tracked: !!product?.trackSerials, units, quantity, room };
    })
    .filter((line) => line.tracked || line.units.length > 0);

  if (lines.length === 0) return null;
  const missing = lines.reduce((sum, l) => sum + l.room, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between pb-3 sm:pb-3">
        <CardTitle>Serial numbers</CardTitle>
        {missing > 0 ? (
          <Badge variant="warning">{missing} without serial</Badge>
        ) : (
          <Badge variant="success">All registered</Badge>
        )}
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <ul className="divide-y divide-border border-t border-border">
          {lines.map((line) => (
            <li key={line.productId} className="space-y-2 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.units.length} of {line.quantity} registered
                    {line.room > 0 && ` · ${line.room} still to scan`}
                  </p>
                </div>
                {line.room > 0 && !purchase.cancelledAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAdding({ productId: line.productId, name: line.name, room: line.room })}
                  >
                    <ScanLine />
                    Add serials
                  </Button>
                )}
              </div>
              {line.units.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {line.units.map((unit) => (
                    <Link
                      key={unit.id}
                      href={`/admin/units/${unit.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Barcode className="size-3.5 text-muted-foreground" />
                      <span className="font-mono text-foreground">{unit.serialNumber}</span>
                      <UnitStatusBadge status={unit.status} condition={unit.condition} />
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      {adding && (
        <RegisterSerialsDialog
          open={!!adding}
          onOpenChange={(open) => !open && setAdding(null)}
          productId={adding.productId}
          productName={adding.name}
          purchaseId={purchase.id}
          purchaseLabel={`Purchase ${purchase.invoiceNumber}`}
          max={adding.room}
        />
      )}
    </Card>
  );
}
