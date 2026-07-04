'use client';

import { useState } from 'react';
import { Boxes, Plus, ScrollText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StockStatusBadge } from '@/components/status-badge';
import { StockAdjustmentDialog } from '@/components/admin/stock-adjustment-dialog';
import { InventoryLedgerSheet } from '@/components/admin/inventory-ledger-sheet';
import { useInventory } from '@/hooks/use-inventory';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/utils';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [ledgerProduct, setLedgerProduct] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useInventory({ page, limit: 20, search: debouncedSearch || undefined });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track stock levels and movement</p>
        </div>
        <Button onClick={() => setAdjustOpen(true)}>
          <Plus />
          Stock Adjustment
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search product..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Boxes} title="No products found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Qty</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Updated</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.productCode}</p>
                    </TableCell>
                    <TableCell>{row.currentStock}</TableCell>
                    <TableCell>{row.minimumStock}</TableCell>
                    <TableCell>
                      <StockStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {formatDate(row.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLedgerProduct({ id: row.id, name: row.name })}
                        title="View ledger"
                      >
                        <ScrollText className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <StockAdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} />
      <InventoryLedgerSheet
        productId={ledgerProduct?.id ?? null}
        productName={ledgerProduct?.name}
        onOpenChange={(open) => !open && setLedgerProduct(null)}
      />
    </div>
  );
}
