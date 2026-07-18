'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coins, HandCoins, Loader2, Receipt, Search, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
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

  function clearFilters() {
    setSearch('');
    setOutstandingOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HandCoins className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Credits</h1>
            {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            What we owe each supplier — increases with every purchase, decreases as you settle
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Purchases" value={formatCurrency(data.totals.totalPurchases)} icon={Receipt} />
            <StatCard
              label="Total Returns"
              value={`−${formatCurrency(data.totals.totalReturns)}`}
              icon={Receipt}
              tone="warning"
            />
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
                    <TableHead className="text-right">Settled</TableHead>
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
                      <TableCell className="whitespace-normal break-words text-right">
                        {formatCurrency(entry.totalPurchases)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        −{formatCurrency(entry.totalReturns)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        −{formatCurrency(entry.totalSettled)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-semibold">
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
                  className="block rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium text-primary">{entry.supplierName}</span>
                    <span className="shrink-0 break-words text-right font-semibold">
                      {formatCurrency(entry.creditBalance)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
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
