'use client';

import { useState } from 'react';
import { AlertTriangle, Boxes, CheckCircle2, Layers, PencilLine, Plus, ScrollText, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { StockStatusBadge } from '@/components/status-badge';
import { StockAdjustmentDialog } from '@/components/admin/stock-adjustment-dialog';
import { InventoryLedgerSheet } from '@/components/admin/inventory-ledger-sheet';
import { useInventory } from '@/hooks/use-inventory';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatDate } from '@/lib/utils';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const debouncedSearch = useDebouncedValue(search);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<string | undefined>(undefined);
  const [ledgerProduct, setLedgerProduct] = useState<{ id: string; name: string } | null>(null);

  const filtersActive = !!search || status !== 'all';

  const { data, isLoading, isFetching, isError, error, refetch } = useInventory({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : (status as 'IN_STOCK' | 'OUT_OF_STOCK'),
  });

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setPage(1);
  }

  function openAdjustFor(productId: string) {
    setAdjustProductId(productId);
    setAdjustOpen(true);
  }

  // Summary counts for top KPI cards
  const totalSKUs = data?.meta?.total ?? 0;
  const inStockCount = data?.data.filter((i) => i.status === 'IN_STOCK').length ?? 0;
  const outOfStockCount = data?.data.filter((i) => i.status === 'OUT_OF_STOCK').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Boxes className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Inventory Management
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Track live stock balances, audit inventory movements, and adjust quantities
          </p>
        </div>

        <Button
          onClick={() => {
            setAdjustProductId(undefined);
            setAdjustOpen(true);
          }}
          className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="size-4" />
          <span>Stock Adjustment</span>
        </Button>
      </div>

      {/* 3 Quick Inventory KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* KPI 1: Total SKUs */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Managed SKUs
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : totalSKUs}
          </p>
        </div>

        {/* KPI 2: In-Stock */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              In-Stock SKUs
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : inStockCount}
          </p>
        </div>

        {/* KPI 3: Out-of-Stock */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Out of Stock Alerts
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : outOfStockCount}
          </p>
        </div>
      </div>

      {/* Main Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all select-none">
        {/* Top Specular Glass Shimmer Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="Live Stock Levels" isFetching={isFetching && !isLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="rounded-full text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching products"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Boxes} title="No products found" description="Products added to catalog will display here" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', isFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Product Details
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Current Quantity
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Stock Status
                      </TableHead>
                      <TableHead className="hidden font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                        Last Updated
                      </TableHead>
                      <TableHead className="w-24 text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {data.data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <p className="font-bold text-foreground">{row.name}</p>
                          {row.productCode && (
                            <span className="mt-1 inline-block rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                              SKU: {row.productCode}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 font-extrabold text-xs text-primary shadow-2xs">
                            {row.currentStock} units
                          </span>
                        </TableCell>
                        <TableCell>
                          <StockStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="hidden text-xs font-medium text-muted-foreground sm:table-cell">
                          {formatDate(row.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAdjustFor(row.id)}
                              title="Adjust stock"
                              className="size-8 rounded-xl bg-muted/50 hover:bg-primary/15 hover:text-primary transition-all"
                            >
                              <PencilLine className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLedgerProduct({ id: row.id, name: row.name })}
                              title="View stock movement ledger"
                              className="size-8 rounded-xl bg-muted/50 hover:bg-primary/15 hover:text-primary transition-all"
                            >
                              <ScrollText className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground text-sm">{row.name}</p>
                      {row.productCode && (
                        <span className="mt-1 inline-block rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          SKU: {row.productCode}
                        </span>
                      )}
                    </div>
                    <StockStatusBadge status={row.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
                    <span className="inline-flex items-center rounded-xl border border-primary/20 bg-primary/10 px-3 py-1 font-extrabold text-xs text-primary">
                      {row.currentStock} units
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAdjustFor(row.id)}
                        title="Adjust stock"
                        className="size-8 rounded-xl bg-muted/50 hover:bg-primary/15 hover:text-primary transition-all"
                      >
                        <PencilLine className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLedgerProduct({ id: row.id, name: row.name })}
                        title="View stock movement ledger"
                        className="size-8 rounded-xl bg-muted/50 hover:bg-primary/15 hover:text-primary transition-all"
                      >
                        <ScrollText className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <StockAdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} defaultProductId={adjustProductId} />
      <InventoryLedgerSheet
        productId={ledgerProduct?.id ?? null}
        productName={ledgerProduct?.name}
        onOpenChange={(open) => !open && setLedgerProduct(null)}
      />
    </div>
  );
}
