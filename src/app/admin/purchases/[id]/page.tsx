'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Ban, Coins, Pencil, RotateCcw, Trash2, Truck, Undo2, Unlink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton, TableSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
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
import { CancelPurchaseDialog } from '@/components/admin/cancel-purchase-dialog';
import { PurchaseRefundCard } from '@/components/admin/purchase-refund-card';
import { UnlinkedReturnsNotice } from '@/components/admin/unlinked-returns-notice';
import { PurchaseSerialsCard } from '@/components/scan/purchase-serials-card';
import { useDeletePurchase, usePurchase, useReinstatePurchase } from '@/hooks/use-purchases';
import {
  useDeletePurchaseReturn,
  usePurchaseReturnsForPurchase,
  useUnlinkPurchaseReturn,
} from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PurchaseReturn } from '@/lib/api/types';

const RETURN_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function canEditPurchaseReturn(purchaseReturn: PurchaseReturn) {
  return (
    !purchaseReturn.isCancellation && Date.now() - new Date(purchaseReturn.createdAt).getTime() <= RETURN_EDIT_WINDOW_MS
  );
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: purchase, isLoading, isError, error, refetch } = usePurchase(id);
  const {
    data: purchaseReturns,
    isLoading: returnsLoading,
    isError: returnsIsError,
    error: returnsError,
    refetch: refetchReturns,
  } = usePurchaseReturnsForPurchase(id);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<PurchaseReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<PurchaseReturn | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const [unlinkingReturn, setUnlinkingReturn] = useState<PurchaseReturn | null>(null);
  const deletePurchase = useDeletePurchase();
  const deletePurchaseReturn = useDeletePurchaseReturn();
  const reinstatePurchase = useReinstatePurchase();
  const unlinkPurchaseReturn = useUnlinkPurchaseReturn();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase" onBack={() => router.back()} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load this purchase" />
        </div>
      </div>
    );
  }

  if (isLoading || !purchase) {
    return <PageSkeleton cards={3} />;
  }

  const grossValue = Number(purchase.totalValue);
  const returnedValue = (purchaseReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const transportCharges = Number(purchase.transportCharges);
  const netValue = grossValue - returnedValue - transportCharges;
  const hasReturns = returnedValue > 0;
  // "Fully Returned" must reflect actual returned value vs. gross — netValue
  // can go negative from transportCharges alone even with only a small
  // partial return, which would otherwise mislabel it as fully returned.
  const isFullyReturned = returnedValue >= grossValue && grossValue > 0;
  const hasTransportCharges = transportCharges > 0;
  const isCancelled = !!purchase.cancelledAt;
  const canUnlinkReturn = (purchaseReturn: PurchaseReturn) => !isCancelled && !purchaseReturn.isCancellation;

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

  function confirmReinstate() {
    reinstatePurchase.mutate(id, {
      onSuccess: () => toast.success('Order reinstated — goods back in stock'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
    setReinstateOpen(false);
  }

  function confirmUnlinkReturn() {
    if (!unlinkingReturn) return;
    const { returnNumber } = unlinkingReturn;
    unlinkPurchaseReturn.mutate(unlinkingReturn.id, {
      onSuccess: () => toast.success(`${returnNumber} unlinked from this order`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
    setUnlinkingReturn(null);
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
      <PageHeader
        title={`Purchase from ${purchase.supplier.name}`}
        description={
          <>
            Invoice {purchase.invoiceNumber} &middot; {formatDate(purchase.purchaseDate)}
            {isCancelled && (
              <>
                {' '}
                &middot; Cancelled {formatDate(purchase.cancelledAt as string)}
                {purchase.cancelReason ? ` — ${purchase.cancelReason}` : ''}
              </>
            )}
          </>
        }
        onBack={() => router.back()}
        meta={
          isCancelled ? (
            <Badge variant="destructive">
              <Ban className="size-3" />
              Cancelled
            </Badge>
          ) : (
            hasReturns && (
              <Badge variant={isFullyReturned ? 'destructive' : 'warning'}>
                {isFullyReturned ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )
          )
        }
        actions={
          isCancelled ? (
            <Button variant="outline" onClick={() => setReinstateOpen(true)} loading={reinstatePurchase.isPending}>
              <RotateCcw />
              Reinstate Order
            </Button>
          ) : (
            <>
              {!isFullyReturned && (
                <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
                  <Undo2 />
                  Record Return
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href={`/admin/purchases/${id}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
                disabled={returnsLoading}
              >
                <Ban />
                Cancel Order
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete
              </Button>
            </>
          )
        }
      />

      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', hasTransportCharges ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <StatCard label="Gross Purchase Value" value={formatCurrency(grossValue)} icon={Wallet} />
        <StatCard
          label="Returned"
          value={`−${formatCurrency(returnedValue)}`}
          icon={Undo2}
          tone={hasReturns ? 'warning' : 'default'}
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

      <UnlinkedReturnsNotice purchase={purchase} returns={purchaseReturns ?? []} />

      <Card className="overflow-hidden">
        <CardHeader className="pb-3 sm:pb-3">
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {item.product?.name ?? item.productId}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border lg:hidden">
            {purchase.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="break-words font-medium">{item.product?.name ?? item.productId}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {item.quantity} &times; {formatCurrency(item.unitCost)}
                  </div>
                </div>
                <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <PurchaseSerialsCard purchase={purchase} returns={purchaseReturns ?? []} />

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between pb-3 sm:pb-3">
          <CardTitle>Returns</CardTitle>
          {purchaseReturns && purchaseReturns.length > 0 && (
            <Badge variant="warning">
              {purchaseReturns.length} return{purchaseReturns.length === 1 ? '' : 's'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {returnsLoading ? (
            <TableSkeleton rows={2} />
          ) : returnsIsError ? (
            <QueryErrorState error={returnsError} onRetry={() => refetchReturns()} />
          ) : !purchaseReturns || purchaseReturns.length === 0 ? (
            <EmptyState icon={Undo2} title="No returns yet" description="Returns sent back to the supplier will appear here" />
          ) : (
            <>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReturns.map((purchaseReturn) => (
                      <TableRow key={purchaseReturn.id}>
                        <TableCell className="font-medium">
                          {purchaseReturn.returnNumber}
                          {purchaseReturn.isCancellation && (
                            <Badge variant="muted" className="ml-2">
                              Cancellation
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">{formatDate(purchaseReturn.returnDate)}</TableCell>
                        <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-destructive">
                          −{formatCurrency(purchaseReturn.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {canUnlinkReturn(purchaseReturn) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label="Unlink return from this order"
                                title="Unlink from this order"
                                onClick={() => setUnlinkingReturn(purchaseReturn)}
                              >
                                <Unlink className="size-3.5" />
                              </Button>
                            )}
                            {canEditPurchaseReturn(purchaseReturn) && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8"
                                  aria-label="Edit return"
                                  onClick={() => setEditingReturn(purchaseReturn)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 text-destructive hover:text-destructive"
                                  aria-label="Delete return"
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
                      <TableCell className="text-right font-semibold tabular-nums text-destructive">
                        −{formatCurrency(returnedValue)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 lg:hidden">
                {purchaseReturns.map((purchaseReturn) => (
                  <div key={purchaseReturn.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words font-medium">
                        {purchaseReturn.returnNumber}
                        {purchaseReturn.isCancellation && (
                          <Badge variant="muted" className="ml-2">
                            Cancellation
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-destructive">
                        −{formatCurrency(purchaseReturn.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-2 break-words text-xs text-muted-foreground">
                      {formatDate(purchaseReturn.returnDate)} &middot; {purchaseReturn.reason}
                    </div>
                    {(canUnlinkReturn(purchaseReturn) || canEditPurchaseReturn(purchaseReturn)) && (
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                        {canUnlinkReturn(purchaseReturn) && (
                          <Button size="sm" variant="outline" onClick={() => setUnlinkingReturn(purchaseReturn)}>
                            <Unlink className="size-3.5" />
                            Unlink
                          </Button>
                        )}
                        {canEditPurchaseReturn(purchaseReturn) && (
                          <>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Edit return"
                          onClick={() => setEditingReturn(purchaseReturn)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete return"
                          onClick={() => setDeletingReturn(purchaseReturn)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm font-semibold">
                  <span>Total returned</span>
                  <span className="tabular-nums text-destructive">−{formatCurrency(returnedValue)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PurchaseRefundCard purchase={purchase} />

      <PurchaseReturnFormDialog open={returnFormOpen} onOpenChange={setReturnFormOpen} purchase={purchase} />
      <CancelPurchaseDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        purchase={purchase}
        returns={purchaseReturns ?? []}
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
              Only for an order entered by mistake — to call off a real order, use Cancel Order so its history is
              kept. This reverses the stock it added; if that stock has already been sold, deletion will fail rather
              than go negative.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePurchase.isPending}
              className={buttonVariants({ variant: 'destructive' })}
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
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''} restocked units and the supplier
              credit it applied. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
              disabled={deletePurchaseReturn.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reinstateOpen} onOpenChange={setReinstateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reinstate order #{purchase.invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The cancellation return is removed: its goods come back into stock and {purchase.supplier.name} is owed
              for them again. Refunds already recorded stay as they are — edit or cancel them separately if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep cancelled</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReinstate}>Reinstate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!unlinkingReturn} onOpenChange={(open) => !open && setUnlinkingReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {unlinkingReturn?.returnNumber} from this order?</AlertDialogTitle>
            <AlertDialogDescription>
              It becomes a return not tied to any order. Stock, the supplier balance and Liquid Cash don&apos;t
              change, but this order will no longer count those units as returned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlinkReturn}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
