'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { usePurchases } from '@/hooks/use-purchases';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePurchases({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Purchases</h1>
          <p className="text-sm text-muted-foreground">Stock purchases recorded from suppliers</p>
        </div>
        <Button asChild>
          <Link href="/admin/purchases/new">
            <Plus />
            Record Purchase
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Truck} title="No purchases recorded yet" description="Record your first supplier purchase" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <Link href={`/admin/purchases/${purchase.id}`} className="font-medium text-primary">
                        {purchase.supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell>{purchase.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell>{purchase.items.length}</TableCell>
                    <TableCell>{formatCurrency(purchase.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
