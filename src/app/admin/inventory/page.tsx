'use client';

import { useState } from 'react';
import { AlertTriangle, Boxes, CheckCircle2, Layers, PencilLine, Plus, ScrollText, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
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
      <PageHeader
        title="Inventory"
        description="Track live stock balances, audit inventory movements, and adjust quantities."
        actions={
          <Button
            onClick={() => {
              setAdjustProductId(undefined);
              setAdjustOpen(true);
            }}
          >
            <Plus />
            Stock Adjustment
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Managed SKUs" value={isLoading ? '—' : totalSKUs} icon={Layers} tone="info" />
        <StatCard label="In-Stock SKUs" value={isLoading ? '—' : inStockCount} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Out of Stock Alerts"
          value={isLoading ? '—' : outOfStockCount}
          icon={AlertTriangle}
          tone="destructive"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Live Stock Levels" isFetching={isFetching && !isLoading} className="pb-3" />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching products"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
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
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Current Quantity</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{row.name}</div>
                        {row.productCode && (
                          <div className="font-mono text-xs text-muted-foreground">SKU: {row.productCode}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {row.currentStock} <span className="text-xs font-normal text-muted-foreground">units</span>
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDate(row.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdjustFor(row.id)}
                            title="Adjust stock"
                            aria-label="Adjust stock"
                            className="size-8"
                          >
                            <PencilLine />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLedgerProduct({ id: row.id, name: row.name })}
                            title="View stock movement ledger"
                            aria-label="View stock movement ledger"
                            className="size-8"
                          >
                            <ScrollText />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((row) => (
                <div key={row.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{row.name}</p>
                      {row.productCode && (
                        <p className="font-mono text-xs text-muted-foreground">SKU: {row.productCode}</p>
                      )}
                    </div>
                    <StockStatusBadge status={row.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-medium tabular-nums">
                      {row.currentStock} <span className="text-xs font-normal text-muted-foreground">units</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAdjustFor(row.id)}
                        title="Adjust stock"
                        aria-label="Adjust stock"
                        className="size-8"
                      >
                        <PencilLine />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLedgerProduct({ id: row.id, name: row.name })}
                        title="View stock movement ledger"
                        aria-label="View stock movement ledger"
                        className="size-8"
                      >
                        <ScrollText />
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
