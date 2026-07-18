'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Search, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { QueryErrorState } from '@/components/query-error-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { PurchaseReturnFormDialog } from '@/components/admin/purchase-return-form-dialog';
import { StandalonePurchaseReturnFormDialog } from '@/components/admin/standalone-purchase-return-form-dialog';
import { useDeletePurchaseReturn, usePurchaseReturns } from '@/hooks/use-purchase-returns';
import { usePurchase } from '@/hooks/use-purchases';
import { useAllSuppliers } from '@/hooks/use-suppliers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseReturn } from '@/lib/api/types';

const RETURN_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function canEditPurchaseReturn(purchaseReturn: PurchaseReturn) {
  return Date.now() - new Date(purchaseReturn.createdAt).getTime() <= RETURN_EDIT_WINDOW_MS;
}

export function PurchaseReturnsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<PurchaseReturn | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || supplierFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data: suppliers } = useAllSuppliers();
  const deletePurchaseReturn = useDeletePurchaseReturn();
  // The list endpoint only shallow-includes `purchase` (no line items) —
  // fetch the full purchase on demand so the edit dialog has what it needs
  // to compute remaining-returnable quantities.
  const { data: editingPurchase } = usePurchase(editingReturn?.purchase?.id);

  const { data, isLoading, isFetching, isError, error, refetch } = usePurchaseReturns({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    supplierId: supplierFilter === 'all' ? undefined : supplierFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setSearch('');
    setSupplierFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function confirmDelete() {
    if (!deletingReturn) return;
    deletePurchaseReturn.mutate(deletingReturn.id, {
      onSuccess: () => {
        toast.success('Return deleted — stock reversed');
        setDeletingReturn(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <SectionHeader title="All returns" isFetching={isFetching && !isLoading} />
      <FilterBar>
        <div className="relative flex-1 sm:max-w-[12rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search return # or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={supplierFilter}
          onValueChange={(v) => {
            setSupplierFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers?.data.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
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
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
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
          <EmptyState icon={Undo2} title="No returns recorded yet" />
        )
      ) : (
        <>
          <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Return #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Purchase</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((purchaseReturn) => (
                  <TableRow key={purchaseReturn.id}>
                    <TableCell className="whitespace-normal break-words">
                      {formatDate(purchaseReturn.returnDate)}
                    </TableCell>
                    <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {purchaseReturn.supplier?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      {purchaseReturn.purchase ? (
                        <Link
                          href={`/admin/purchases/${purchaseReturn.purchase.id}`}
                          className="text-primary hover:underline"
                        >
                          {purchaseReturn.purchase.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Standalone</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      −{formatCurrency(purchaseReturn.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {canEditPurchaseReturn(purchaseReturn) && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingReturn(purchaseReturn)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeletingReturn(purchaseReturn)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {data.data.map((purchaseReturn) => (
              <div key={purchaseReturn.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="break-words font-medium">{purchaseReturn.returnNumber}</span>
                  <span className="shrink-0 break-words font-semibold text-destructive">
                    −{formatCurrency(purchaseReturn.totalAmount)}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{purchaseReturn.reason}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{purchaseReturn.supplier?.name ?? '—'}</span>
                  {purchaseReturn.purchase ? (
                    <Link href={`/admin/purchases/${purchaseReturn.purchase.id}`} className="text-primary hover:underline">
                      {purchaseReturn.purchase.invoiceNumber}
                    </Link>
                  ) : (
                    <span>Standalone</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(purchaseReturn.returnDate)}</p>
                {canEditPurchaseReturn(purchaseReturn) && (
                  <div className="mt-2 flex justify-end gap-1 border-t border-border pt-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingReturn(purchaseReturn)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeletingReturn(purchaseReturn)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}

      {editingReturn?.purchase ? (
        <PurchaseReturnFormDialog
          open={!!editingReturn && !!editingPurchase}
          onOpenChange={(open) => !open && setEditingReturn(null)}
          purchase={editingPurchase ?? null}
          editingReturn={editingReturn}
        />
      ) : (
        <StandalonePurchaseReturnFormDialog
          open={!!editingReturn && !editingReturn?.purchase}
          onOpenChange={(open) => !open && setEditingReturn(null)}
          supplierId={editingReturn?.supplierId}
          editingReturn={editingReturn}
        />
      )}

      <AlertDialog open={!!deletingReturn} onOpenChange={(open) => !open && setDeletingReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this return?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently reverses return {deletingReturn?.returnNumber} — removes the{' '}
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''} restocked units and the supplier
              credit it applied. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePurchaseReturn.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
