'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Loader2, ScrollText, User, X } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { TableSkeleton } from '@/components/loading-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useInventoryLedger } from '@/hooks/use-inventory';
import { cn, formatDateTime } from '@/lib/utils';
import type { InventoryLogType } from '@/lib/api/types';

const TYPE_LABEL: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  PURCHASE: { label: 'Purchase', variant: 'default' },
  SALE: { label: 'Sale', variant: 'success' },
  ADJUSTMENT: { label: 'Adjustment', variant: 'warning' },
  RESERVE: { label: 'Reserved', variant: 'purple' },
  RELEASE: { label: 'Released', variant: 'info' },
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

  const { data, isLoading, isFetching, isError, error, refetch } = useInventoryLedger(productId ?? undefined, {
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
      <SheetContent
        side="right"
        title="Stock ledger"
        className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
      >
        {/* Fixed Top Header & Filter Bar */}
        <div className="shrink-0">
          <SheetHeader className="space-y-0 px-4 pb-3 pr-12 pt-4 sm:px-5 sm:pr-14 sm:pt-5">
            <SheetTitle className="flex items-center gap-2">
              <ScrollText className="size-[18px] text-muted-foreground" />
              <span>Stock Movement Ledger</span>
              {isFetching && !isLoading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />
              )}
            </SheetTitle>
            {productName && (
              <p className="truncate text-sm text-muted-foreground">
                Product: <span className="font-medium text-foreground">{productName}</span>
              </p>
            )}
          </SheetHeader>

          {/* Filter Controls Bar */}
          <div className="flex flex-col gap-2.5 border-y border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as 'all' | InventoryLogType);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All Movement Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABEL).map(([value, conf]) => (
                  <SelectItem key={value} value={value}>
                    {conf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-1 items-center gap-1.5 sm:flex-none">
              <span className="text-sm text-muted-foreground">From</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-40"
              />
            </div>

            <div className="flex flex-1 items-center gap-1.5 sm:flex-none">
              <span className="text-sm text-muted-foreground">To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-40"
              />
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Main Ledger Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : !data || data.data.length === 0 ? (
            filtersActive ? (
              <EmptyState
                icon={ScrollText}
                title="No matching stock movements"
                description="Try adjusting or clearing your date range and type filters"
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={ScrollText} title="No stock movements recorded" description="Stock adjustments, purchases, and sales will appear here" />
            )
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="min-w-[220px]">Movement Details &amp; Performer</TableHead>
                      <TableHead className="text-right">Qty In</TableHead>
                      <TableHead className="text-right">Qty Out</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((log) => {
                      const typeInfo = TYPE_LABEL[log.type] ?? { label: log.type, variant: 'muted' as const };
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="max-w-md whitespace-normal">
                            <p className="break-words leading-snug text-foreground">{log.description}</p>
                            {log.performedBy && (
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="size-3" />
                                <span>
                                  By: <span className="font-medium text-foreground">{log.performedBy}</span>
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.quantityIn ? (
                              <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-success">
                                <ArrowDownLeft className="size-3" />
                                +{log.quantityIn}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {log.quantityOut ? (
                              <span className="inline-flex items-center gap-0.5 font-medium tabular-nums text-destructive">
                                <ArrowUpRight className="size-3" />
                                -{log.quantityOut}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {log.balanceAfter} <span className="text-xs font-normal text-muted-foreground">units</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards View */}
              <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
                {data.data.map((log) => {
                  const typeInfo = TYPE_LABEL[log.type] ?? { label: log.type, variant: 'muted' as const };
                  return (
                    <div key={log.id} className="space-y-2.5 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>

                      <p className="break-words text-sm font-medium leading-relaxed text-foreground">
                        {log.description}
                      </p>

                      {log.performedBy && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="size-3" />
                          <span>
                            By: <span className="font-medium text-foreground">{log.performedBy}</span>
                          </span>
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-border pt-2 text-xs tabular-nums">
                        <div className="flex items-center gap-2 font-medium">
                          {log.quantityIn ? (
                            <span className="inline-flex items-center gap-0.5 text-success">
                              <ArrowDownLeft className="size-3" />
                              +{log.quantityIn} in
                            </span>
                          ) : null}
                          {log.quantityOut ? (
                            <span className="inline-flex items-center gap-0.5 text-destructive">
                              <ArrowUpRight className="size-3" />
                              -{log.quantityOut} out
                            </span>
                          ) : null}
                        </div>
                        <span className="font-medium text-foreground">Balance: {log.balanceAfter} units</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Fixed Bottom Pagination */}
        {data && data.meta && (
          <div className="shrink-0">
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
