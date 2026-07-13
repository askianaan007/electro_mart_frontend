'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useInventoryLedger } from '@/hooks/use-inventory';
import { formatDateTime } from '@/lib/utils';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  ADJUSTMENT: 'Adjustment',
  RESERVE: 'Reserved',
  RELEASE: 'Released',
};

export function InventoryLedgerSheet({
  productId,
  productName,
  onOpenChange,
}: {
  productId: string | null;
  productName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInventoryLedger(productId ?? undefined, { page, limit: 15 });

  return (
    <Sheet open={!!productId} onOpenChange={onOpenChange}>
      <SheetContent side="right" title="Stock ledger" className="w-full max-w-md sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Stock ledger{productName ? ` — ${productName}` : ''}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <EmptyState icon={ScrollText} title="No stock movement yet" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABEL[log.type] ?? log.type}</Badge>
                      </TableCell>
                      <TableCell>{log.quantityIn || '—'}</TableCell>
                      <TableCell>{log.quantityOut || '—'}</TableCell>
                      <TableCell className="font-medium">{log.balanceAfter}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationBar meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
