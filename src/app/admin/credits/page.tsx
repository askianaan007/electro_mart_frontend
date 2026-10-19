'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coins, HandCoins, Receipt, Search, Truck, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/loading-state';
import { useCreditsSummary } from '@/hooks/use-credits';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency } from '@/lib/utils';

export default function CreditsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const filtersActive = !!search || outstandingOnly;

  const { data, isLoading, isFetching, isError, error, refetch } = useCreditsSummary({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    onlyOutstanding: outstandingOnly || undefined,
  });

  // Optional breakdown columns only appear when some supplier on this page has them.
  // Balance = purchases − returns + replacements − settled − transport + refunds received.
  const entries = data?.entries ?? [];
  const showTransport = entries.some((e) => Number(e.totalTransportCharges) > 0);
  const showReplacements = entries.some((e) => Number(e.totalReplacements ?? 0) > 0);
  const showRefunds = entries.some((e) => Number(e.totalRefundsReceived ?? 0) > 0);
  const hasTotalTransport = !!data && Number(data.totals.totalTransportCharges) > 0;

  function clearFilters() {
    setSearch('');
    setOutstandingOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credits"
        description="What we owe each supplier — increases with every purchase, decreases as you settle."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        data && (
          <div className={cn('grid gap-4 sm:grid-cols-2', hasTotalTransport ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
            <StatCard label="Total Purchases" value={formatCurrency(data.totals.totalPurchases)} icon={Receipt} />
            <StatCard
              label="Total Returns"
              value={`−${formatCurrency(data.totals.totalReturns)}`}
              icon={Receipt}
              tone="warning"
            />
            {hasTotalTransport && (
              <StatCard
                label="Transport Charges"
                value={`−${formatCurrency(data.totals.totalTransportCharges)}`}
                icon={Truck}
                tone="warning"
                hint="Deducted from credit"
              />
            )}
            <StatCard
              label="Total Settled"
              value={`−${formatCurrency(data.totals.totalSettled)}`}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Total Credit Balance"
              value={formatCurrency(data.totals.totalCreditBalance)}
              icon={Coins}
              hint="Owed across all matching suppliers"
            />
          </div>
        )
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Supplier balances" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={outstandingOnly}
              onCheckedChange={(checked) => {
                setOutstandingOnly(checked);
                setPage(1);
              }}
            />
            Outstanding only
          </label>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.entries.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching suppliers"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={HandCoins} title="No suppliers yet" description="Add a supplier to start tracking credit" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total Purchases</TableHead>
                    <TableHead className="text-right">Returns</TableHead>
                    {showReplacements && <TableHead className="text-right">Replacements</TableHead>}
                    {showTransport && <TableHead className="text-right">Transport</TableHead>}
                    <TableHead className="text-right">Settled</TableHead>
                    {showRefunds && <TableHead className="text-right">Refunds Received</TableHead>}
                    <TableHead className="text-right">Credit Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.supplierId}>
                      <TableCell className="whitespace-normal break-words">
                        <Link href={`/admin/credits/${entry.supplierId}`} className="font-medium text-primary hover:underline">
                          {entry.supplierName}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right tabular-nums">
                        {formatCurrency(entry.totalPurchases)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                        −{formatCurrency(entry.totalReturns)}
                      </TableCell>
                      {showReplacements && (
                        <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                          {Number(entry.totalReplacements ?? 0) > 0 ? `+${formatCurrency(entry.totalReplacements ?? 0)}` : '—'}
                        </TableCell>
                      )}
                      {showTransport && (
                        <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                          {Number(entry.totalTransportCharges) > 0 ? `−${formatCurrency(entry.totalTransportCharges)}` : '—'}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                        −{formatCurrency(entry.totalSettled)}
                      </TableCell>
                      {showRefunds && (
                        <TableCell className="whitespace-normal break-words text-right tabular-nums text-muted-foreground">
                          {Number(entry.totalRefundsReceived ?? 0) > 0
                            ? `+${formatCurrency(entry.totalRefundsReceived ?? 0)}`
                            : '—'}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-normal break-words text-right font-semibold tabular-nums">
                        {formatCurrency(entry.creditBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.entries.map((entry) => (
                <Link
                  key={entry.supplierId}
                  href={`/admin/credits/${entry.supplierId}`}
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium text-primary">{entry.supplierName}</span>
                    <span className="shrink-0 break-words text-right font-semibold tabular-nums">
                      {formatCurrency(entry.creditBalance)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
                    <div>
                      <p className="text-muted-foreground">Purchases</p>
                      <p className="break-words font-medium">{formatCurrency(entry.totalPurchases)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Returns</p>
                      <p className="break-words font-medium">−{formatCurrency(entry.totalReturns)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Settled</p>
                      <p className="break-words font-medium">−{formatCurrency(entry.totalSettled)}</p>
                    </div>
                    {Number(entry.totalReplacements ?? 0) > 0 && (
                      <div>
                        <p className="text-muted-foreground">Replacements</p>
                        <p className="break-words font-medium">+{formatCurrency(entry.totalReplacements ?? 0)}</p>
                      </div>
                    )}
                    {Number(entry.totalTransportCharges) > 0 && (
                      <div>
                        <p className="text-muted-foreground">Transport</p>
                        <p className="break-words font-medium">−{formatCurrency(entry.totalTransportCharges)}</p>
                      </div>
                    )}
                    {Number(entry.totalRefundsReceived ?? 0) > 0 && (
                      <div>
                        <p className="text-muted-foreground">Refunds</p>
                        <p className="break-words font-medium">+{formatCurrency(entry.totalRefundsReceived ?? 0)}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
