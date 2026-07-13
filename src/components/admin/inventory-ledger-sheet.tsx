'use client';

import { useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useInventoryLedger } from '@/hooks/use-inventory';
import { cn, formatDateTime } from '@/lib/utils';
import type { InventoryLogType } from '@/lib/api/types';

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
  const [type, setType] = useState<'all' | InventoryLogType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filtersActive = type !== 'all' || !!dateFrom || !!dateTo;

  const { data, isLoading, isFetching } = useInventoryLedger(productId ?? undefined, {
    page,
    limit: 15,
    type: type === 'all' ? undefined : type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setType('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <Sheet
      open={!!productId}
      onOpenChange={(open) => {
        if (!open) {
          setPage(1);
          clearFilters();
        }
        onOpenChange(open);
      }}
    >
      <SheetContent side="right" title="Stock ledger" className="w-full max-w-md sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Stock ledger{productName ? ` — ${productName}` : ''}
            {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as 'all' | InventoryLogType);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={ScrollText}
                title="No matching movements"
                description="Try adjusting or clearing your filters"
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={ScrollText} title="No stock movement yet" />
            )
          ) : (
            <>
              <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
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
              </div>
              <PaginationBar meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
