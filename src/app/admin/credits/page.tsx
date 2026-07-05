'use client';

import Link from 'next/link';
import { HandCoins } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { useCreditsSummary } from '@/hooks/use-credits';
import { formatCurrency } from '@/lib/utils';

export default function CreditsPage() {
  const { data, isLoading } = useCreditsSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credits</h1>
        <p className="text-sm text-muted-foreground">
          What we owe each supplier — increases with every purchase, decreases as you settle
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.entries.length === 0 ? (
          <EmptyState icon={HandCoins} title="No suppliers yet" description="Add a supplier to start tracking credit" />
        ) : (
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
                  <TableCell>
                    <Link href={`/admin/credits/${entry.supplierId}`} className="font-medium text-primary">
                      {entry.supplierName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.totalPurchases)}</TableCell>
                  <TableCell className="text-right">−{formatCurrency(entry.totalReturns)}</TableCell>
                  <TableCell className="text-right">−{formatCurrency(entry.totalSettled)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(entry.creditBalance)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(data.totals.totalPurchases)}</TableCell>
                <TableCell className="text-right font-semibold">−{formatCurrency(data.totals.totalReturns)}</TableCell>
                <TableCell className="text-right font-semibold">−{formatCurrency(data.totals.totalSettled)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(data.totals.totalCreditBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
