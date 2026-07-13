'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Plus, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeletePurchase, usePurchases } from '@/hooks/use-purchases';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Purchase } from '@/lib/api/types';

function purchaseTotals(purchase: Purchase) {
  const grossValue = Number(purchase.totalValue);
  const returnedValue = (purchase.purchaseReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const netValue = grossValue - returnedValue;
  return { grossValue, returnedValue, netValue, hasReturns: returnedValue > 0 };
}

function ReturnedBadge({ netValue }: { netValue: number }) {
  return (
    <Badge variant={netValue <= 0 ? 'destructive' : 'warning'}>
      {netValue <= 0 ? 'Fully Returned' : 'Partially Returned'}
    </Badge>
  );
}

function ValueBreakdown({ purchase, className }: { purchase: Purchase; className?: string }) {
  const { grossValue, returnedValue, netValue, hasReturns } = purchaseTotals(purchase);

  if (!hasReturns) {
    return <span className={cn('font-medium', className)}>{formatCurrency(grossValue)}</span>;
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-muted-foreground line-through">{formatCurrency(grossValue)}</span>
      <span className="text-xs font-medium text-destructive">−{formatCurrency(returnedValue)} returned</span>
      <span className="font-semibold">{formatCurrency(netValue)} net</span>
    </div>
  );
}

export default function PurchasesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePurchases({ page, limit: 20 });
  const [deletingPurchase, setDeletingPurchase] = useState<Purchase | null>(null);
  const deletePurchase = useDeletePurchase();

  function confirmDelete() {
    if (!deletingPurchase) return;
    deletePurchase.mutate(deletingPurchase.id, {
      onSuccess: () => {
        toast.success('Purchase deleted — stock reversed');
        setDeletingPurchase(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingPurchase(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Purchases</h1>
            <p className="mt-1 text-sm text-muted-foreground">Stock purchases recorded from suppliers</p>
          </div>
        </div>
        <Button asChild className="shrink-0">
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
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((purchase) => {
                    const { hasReturns, netValue } = purchaseTotals(purchase);
                    return (
                      <TableRow
                        key={purchase.id}
                        className={cn(hasReturns && 'border-l-4 border-l-warning bg-warning/5')}
                      >
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/purchases/${purchase.id}`}
                              className="whitespace-normal break-words font-medium text-primary hover:underline"
                            >
                              {purchase.supplier.name}
                            </Link>
                            {hasReturns && <ReturnedBadge netValue={netValue} />}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">{purchase.invoiceNumber}</TableCell>
                        <TableCell className="whitespace-normal break-words">{formatDate(purchase.purchaseDate)}</TableCell>
                        <TableCell>{purchase.items.length}</TableCell>
                        <TableCell className="text-right">
                          <ValueBreakdown purchase={purchase} className="items-end" />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/purchases/${purchase.id}`}>View details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeletingPurchase(purchase)}>
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 sm:hidden">
              {data.data.map((purchase) => {
                const { hasReturns, netValue } = purchaseTotals(purchase);
                return (
                  <div
                    key={purchase.id}
                    className={cn(
                      'rounded-lg border border-border p-4',
                      hasReturns && 'border-l-4 border-l-warning bg-warning/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="break-words font-medium text-primary hover:underline"
                        >
                          {purchase.supplier.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{purchase.invoiceNumber}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/purchases/${purchase.id}`}>View details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingPurchase(purchase)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {hasReturns && (
                      <div className="mt-2">
                        <ReturnedBadge netValue={netValue} />
                      </div>
                    )}
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        <p>{formatDate(purchase.purchaseDate)}</p>
                        <p>{purchase.items.length} item(s)</p>
                      </div>
                      <ValueBreakdown purchase={purchase} className="items-end text-right" />
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <AlertDialog open={!!deletingPurchase} onOpenChange={(open) => !open && setDeletingPurchase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the stock it added (and any returns recorded against it). If that stock has already
              been sold, deletion will fail rather than go negative.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
