'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Loader2, ScrollText, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useInventoryLedger } from '@/hooks/use-inventory';
import { cn, formatDateTime } from '@/lib/utils';
import type { InventoryLogType } from '@/lib/api/types';

const TYPE_LABEL: Record<string, { label: string; className: string }> = {
  PURCHASE: {
    label: 'Purchase',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold',
  },
  SALE: {
    label: 'Sale',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold',
  },
  RESERVE: {
    label: 'Reserved',
    className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold',
  },
  RELEASE: {
    label: 'Released',
    className: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-bold',
  },
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
      <SheetContent
        side="right"
        title="Stock ledger"
        className="w-full max-w-full sm:max-w-3xl lg:max-w-4xl rounded-l-3xl border-l border-border/60 bg-card/95 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between select-none"
      >
        {/* Specular Shimmer Top Curve Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-tl-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <div className="space-y-4">
          {/* Sheet Header */}
          <SheetHeader className="relative z-10 space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                <ScrollText className="size-4.5" />
              </div>
              <SheetTitle className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
                <span>Stock Movement Ledger</span>
                {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-primary" />}
              </SheetTitle>
            </div>
            {productName && (
              <p className="text-xs text-muted-foreground font-semibold">
                Product: <span className="text-foreground font-bold">{productName}</span>
              </p>
            )}
          </SheetHeader>

          {/* Filter Bar */}
          <div className="relative z-10 flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-3 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as 'all' | InventoryLogType);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-40 h-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold text-xs">
                <SelectValue placeholder="All Movement Types" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_LABEL).map(([value, conf]) => (
                  <SelectItem key={value} value={value}>
                    {conf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-xs font-bold text-muted-foreground">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full sm:w-36 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <span className="text-xs font-bold text-muted-foreground">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full sm:w-36 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
              />
            </div>

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
                <span>Clear filters</span>
              </Button>
            )}
          </div>

          {/* Main Ledger Content */}
          <div className="relative z-10 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : !data || data.data.length === 0 ? (
              filtersActive ? (
                <EmptyState
                  icon={ScrollText}
                  title="No matching stock movements"
                  description="Try adjusting or clearing your date range and type filters"
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={ScrollText} title="No stock movements recorded" description="Stock adjustments, purchases, and sales will appear here" />
              )
            ) : (
              <>
                {/* Desktop Table View (100% Fully Visible Text) */}
                <div className={cn('hidden sm:block overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md', isFetching && 'opacity-60 transition-opacity')}>
                  <Table>
                    <TableHeader className="bg-muted/60">
                      <TableRow className="hover:bg-transparent border-border/60">
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Type
                        </TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Movement Details &amp; Performer
                        </TableHead>
                        <TableHead className="text-center font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Qty In
                        </TableHead>
                        <TableHead className="text-center font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Qty Out
                        </TableHead>
                        <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Balance After
                        </TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                          Timestamp
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {data.data.map((log) => {
                        const typeInfo = TYPE_LABEL[log.type] ?? {
                          label: log.type,
                          className: 'bg-muted/60 text-muted-foreground border-border/50',
                        };
                        return (
                          <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell>
                              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs backdrop-blur-md', typeInfo.className)}>
                                {typeInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="font-semibold text-xs sm:text-sm text-foreground leading-snug break-words">
                                {log.description}
                              </p>
                              {log.performedBy && (
                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                  By: <span className="font-bold text-foreground">{log.performedBy}</span>
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {log.quantityIn ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                  <ArrowDownLeft className="size-3" />
                                  +{log.quantityIn}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {log.quantityOut ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-black text-rose-600 dark:text-rose-400">
                                  <ArrowUpRight className="size-3" />
                                  -{log.quantityOut}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs sm:text-sm text-foreground">
                              {log.balanceAfter} units
                            </TableCell>
                            <TableCell className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards View */}
                <div className={cn('space-y-3 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
                  {data.data.map((log) => {
                    const typeInfo = TYPE_LABEL[log.type] ?? {
                      label: log.type,
                      className: 'bg-muted/60 text-muted-foreground border-border/50',
                    };
                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-border/60 bg-background/60 p-3.5 backdrop-blur-md space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]', typeInfo.className)}>
                            {typeInfo.label}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>

                        <p className="font-bold text-xs text-foreground leading-snug break-words">
                          {log.description}
                        </p>

                        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                          <div className="flex items-center gap-2">
                            {log.quantityIn ? (
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                +{log.quantityIn} in
                              </span>
                            ) : null}
                            {log.quantityOut ? (
                              <span className="font-black text-rose-600 dark:text-rose-400">
                                -{log.quantityOut} out
                              </span>
                            ) : null}
                          </div>
                          <span className="font-black text-foreground">
                            Balance: {log.balanceAfter} units
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Pagination */}
        {data && data.meta && (
          <div className="relative z-10 pt-3 border-t border-border/60">
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
