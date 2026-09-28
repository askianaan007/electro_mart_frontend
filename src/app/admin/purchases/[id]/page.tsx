'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Coins, Eye, PackageCheck, Pencil, Trash2, Truck, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
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
import { ReplacementReceiptFormDialog } from '@/components/admin/replacement-receipt-form-dialog';
import { ReturnDetailSheet } from '@/components/admin/return-detail-sheet';
import { ReplacementStatusBadge, replacementProgress } from '@/components/admin/replacement-status-badge';
import { useDeletePurchase, usePurchase } from '@/hooks/use-purchases';
import { useDeletePurchaseReturn, usePurchaseReturnsForPurchase } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseReturn } from '@/lib/api/types';

const RETURN_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Mirrors the server: editable within 1 day, and never once goods have been
// received against it.
function canEditPurchaseReturn(purchaseReturn: PurchaseReturn) {
  return (
    !replacementProgress(purchaseReturn).hasReceipts &&
    Date.now() - new Date(purchaseReturn.createdAt).getTime() <= RETURN_EDIT_WINDOW_MS
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: purchase, isLoading } = usePurchase(id);
  const { data: purchaseReturns, isLoading: returnsLoading } = usePurchaseReturnsForPurchase(id);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<PurchaseReturn | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewingReturnId, setViewingReturnId] = useState<string | null>(null);
  const [receivingReturn, setReceivingReturn] = useState<PurchaseReturn | null>(null);
  const deletePurchase = useDeletePurchase();
  const deletePurchaseReturn = useDeletePurchaseReturn();

  if (isLoading || !purchase) {
    return <Skeleton className="h-96 w-full" />;
  }

  const grossValue = Number(purchase.totalValue);
  const returnedValue = (purchaseReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const replacedValue = (purchaseReturns ?? []).reduce((sum, r) => sum + Number(r.receivedAmount ?? 0), 0);
  const transportCharges = Number(purchase.transportCharges);
  const netValue = grossValue - returnedValue + replacedValue - transportCharges;
  // Replacement receipts are real goods received — the server refuses to
  // unwind them by deleting the purchase, so don't offer it.
  const hasReplacementHistory = (purchaseReturns ?? []).some((r) => replacementProgress(r).hasReceipts);
  const hasReturns = returnedValue > 0;
  // "Fully Returned" must reflect actual returned value vs. gross — netValue
  // can go negative from transportCharges alone even with only a small
  // partial return, which would otherwise mislabel it as fully returned.
  const isFullyReturned = returnedValue - replacedValue >= grossValue && grossValue > 0;
  const hasTransportCharges = transportCharges > 0;

  function confirmDelete() {
    deletePurchase.mutate(id, {
      onSuccess: () => {
        toast.success('Purchase deleted — stock reversed');
        router.push('/admin/purchases');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  function confirmDeleteReturn() {
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
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Purchase from {purchase.supplier.name}</h1>
            {hasReturns && (
              <Badge variant={isFullyReturned ? 'destructive' : 'warning'}>
                {isFullyReturned ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Invoice {purchase.invoiceNumber} &middot; {formatDate(purchase.purchaseDate)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="col-span-2 sm:col-auto" onClick={() => setReturnFormOpen(true)}>
            <Undo2 />
            Record Return
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/purchases/${id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={hasReplacementHistory}
            title={
              hasReplacementHistory
                ? 'This purchase has returns with replacement receipts and cannot be deleted'
                : undefined
            }
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2',
          hasTransportCharges ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        )}
      >
        <StatCard label="Gross Purchase Value" value={formatCurrency(grossValue)} icon={Wallet} />
        <StatCard
          label="Returned"
          value={`−${formatCurrency(returnedValue)}`}
          icon={Undo2}
          tone={hasReturns ? 'warning' : 'default'}
          hint={replacedValue > 0 ? `+${formatCurrency(replacedValue)} replaced by supplier` : undefined}
        />
        {hasTransportCharges && (
          <StatCard
            label="Transport Charges"
            value={`−${formatCurrency(transportCharges)}`}
            icon={Truck}
            tone="warning"
            hint="Deducted from supplier credit"
          />
        )}
        <StatCard label="Net Value" value={formatCurrency(netValue)} icon={Coins} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal break-words">
                    {item.product?.name ?? item.productId}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Returns</CardTitle>
          {purchaseReturns && purchaseReturns.length > 0 && (
            <Badge variant="warning">
              {purchaseReturns.length} return{purchaseReturns.length === 1 ? '' : 's'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {returnsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !purchaseReturns || purchaseReturns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="No returns yet"
              description="Returns sent back to the supplier will appear here"
            />
          ) : (
            <>
              {/* Mobile: tap a return to open its detail & replacement history */}
              <div className="space-y-3 p-4 sm:hidden">
                {purchaseReturns.map((purchaseReturn) => {
                  const progress = replacementProgress(purchaseReturn);
                  return (
                    <div key={purchaseReturn.id} className="rounded-lg border border-border p-3">
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setViewingReturnId(purchaseReturn.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words font-medium">{purchaseReturn.returnNumber}</span>
                          <span className="shrink-0 font-semibold text-destructive">
                            −{formatCurrency(purchaseReturn.totalAmount)}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-sm text-muted-foreground">{purchaseReturn.reason}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <ReplacementStatusBadge status={purchaseReturn.replacementStatus} />
                          <span className="text-xs text-muted-foreground">{formatDate(purchaseReturn.returnDate)}</span>
                        </div>
                        {progress.hasReceipts && (
                          <p className="mt-1 text-xs font-medium text-success">
                            {progress.received}/{progress.returned} received · +
                            {formatCurrency(purchaseReturn.receivedAmount ?? 0)}
                          </p>
                        )}
                      </button>
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn('h-10', progress.isFull && 'col-span-2')}
                          onClick={() => setViewingReturnId(purchaseReturn.id)}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                        {!progress.isFull && (
                          <Button size="sm" className="h-10" onClick={() => setReceivingReturn(purchaseReturn)}>
                            <PackageCheck className="size-3.5" />
                            Receive
                          </Button>
                        )}
                        {canEditPurchaseReturn(purchaseReturn) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10"
                              onClick={() => setEditingReturn(purchaseReturn)}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 text-destructive hover:text-destructive"
                              onClick={() => setDeletingReturn(purchaseReturn)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm font-semibold">
                  <span>Total returned</span>
                  <span className="text-right">
                    <span className="text-destructive">−{formatCurrency(returnedValue)}</span>
                    {replacedValue > 0 && (
                      <span className="block text-xs text-success">+{formatCurrency(replacedValue)} replaced</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Replacement</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReturns.map((purchaseReturn) => (
                      <TableRow key={purchaseReturn.id}>
                        <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                        <TableCell className="whitespace-normal break-words">
                          {formatDate(purchaseReturn.returnDate)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          −{formatCurrency(purchaseReturn.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <ReplacementStatusBadge status={purchaseReturn.replacementStatus} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="View details & replacement history"
                              aria-label="View details & replacement history"
                              onClick={() => setViewingReturnId(purchaseReturn.id)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            {!replacementProgress(purchaseReturn).isFull && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Receive replacement"
                                aria-label="Receive replacement"
                                onClick={() => setReceivingReturn(purchaseReturn)}
                              >
                                <PackageCheck className="size-3.5" />
                              </Button>
                            )}
                            {canEditPurchaseReturn(purchaseReturn) && (
                              <>
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
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={3} className="font-semibold">
                        Total returned
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        −{formatCurrency(returnedValue)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-success">
                        {replacedValue > 0 ? `+${formatCurrency(replacedValue)} replaced` : ''}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PurchaseReturnFormDialog open={returnFormOpen} onOpenChange={setReturnFormOpen} purchase={purchase} />
      <ReturnDetailSheet purchaseReturnId={viewingReturnId} onOpenChange={(o) => !o && setViewingReturnId(null)} />
      <ReplacementReceiptFormDialog
        open={!!receivingReturn}
        onOpenChange={(o) => !o && setReceivingReturn(null)}
        purchaseReturn={receivingReturn}
      />
      <PurchaseReturnFormDialog
        open={!!editingReturn}
        onOpenChange={(open) => !open && setEditingReturn(null)}
        purchase={purchase}
        editingReturn={editingReturn}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the stock it added (and any returns recorded against it). If that stock has already been
              sold, deletion will fail rather than go negative.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePurchase.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingReturn} onOpenChange={(open) => !open && setDeletingReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this return?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently reverses return {deletingReturn?.returnNumber} — removes the{' '}
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''} restocked units and the supplier credit
              it applied. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
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
