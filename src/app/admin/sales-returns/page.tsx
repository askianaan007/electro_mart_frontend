'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesReturns } from '@/hooks/use-sales-returns';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SalesReturn } from '@/lib/api/types';

function ItemsBreakdown({ salesReturn }: { salesReturn: SalesReturn }) {
  return (
    <div className="space-y-2 border-t border-border bg-muted/30 p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Original Price</TableHead>
            <TableHead className="text-right">Allocated Discount</TableHead>
            <TableHead className="text-right">Refund</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesReturn.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal break-words">{item.product?.name ?? item.productId}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
              <TableCell className="text-right text-destructive">
                {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ItemsBreakdownMobile({ salesReturn }: { salesReturn: SalesReturn }) {
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {salesReturn.items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
          <div className="min-w-0">
            <p className="break-words font-medium text-foreground">{item.product?.name ?? item.productId}</p>
            <p className="text-muted-foreground">
              {item.quantity} &times; {formatCurrency(item.unitPrice)}
              {Number(item.allocatedDiscount) > 0 && (
                <span className="text-destructive"> −{formatCurrency(item.allocatedDiscount)} discount</span>
              )}
            </p>
          </div>
          <span className="shrink-0 font-medium">{formatCurrency(item.lineTotal)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalesReturnsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search;

  const { data, isLoading, isFetching } = useSalesReturns({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Undo2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Sales Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every product returned by a dealer, with the exact refund breakdown recorded for it
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="All returns" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[16rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search return #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching returns"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Undo2} title="No sales returns recorded yet" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Date</TableHead>
                    <TableHead>Return #</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((salesReturn) => {
                    const isExpanded = expanded.has(salesReturn.id);
                    return (
                      <Fragment key={salesReturn.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpanded(salesReturn.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            {formatDate(salesReturn.returnDate)}
                          </TableCell>
                          <TableCell className="font-medium">{salesReturn.returnNumber}</TableCell>
                          <TableCell>
                            {salesReturn.order ? (
                              <Link
                                href={`/admin/orders/${salesReturn.order.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline"
                              >
                                {salesReturn.order.orderNumber}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            {salesReturn.dealer?.businessName ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">{salesReturn.reason}</TableCell>
                          <TableCell className="text-right">{salesReturn.items.length}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            −{formatCurrency(salesReturn.totalAmount)}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={8} className="p-0">
                              <ItemsBreakdown salesReturn={salesReturn} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((salesReturn) => {
                const isExpanded = expanded.has(salesReturn.id);
                return (
                  <div
                    key={salesReturn.id}
                    className="rounded-lg border border-border p-4"
                    onClick={() => toggleExpanded(salesReturn.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="break-words font-medium">{salesReturn.returnNumber}</span>
                      <span className="shrink-0 break-words font-semibold text-destructive">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{salesReturn.reason}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="break-words">{salesReturn.dealer?.businessName ?? '—'}</span>
                      {salesReturn.order ? (
                        <Link
                          href={`/admin/orders/${salesReturn.order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline"
                        >
                          {salesReturn.order.orderNumber}
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(salesReturn.returnDate)}</p>
                    {isExpanded && <ItemsBreakdownMobile salesReturn={salesReturn} />}
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
