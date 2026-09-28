'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Ban, PackageCheck, Pencil, Undo2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ReplacementReceiptFormDialog } from '@/components/admin/replacement-receipt-form-dialog';
import { ReplacementStatusBadge, replacementProgress } from '@/components/admin/replacement-status-badge';
import { usePurchaseReturn, useReplacementReceipts, useVoidReplacementReceipt } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ReplacementReceipt } from '@/lib/api/types';

const VOID_WINDOW_MS = 24 * 60 * 60 * 1000;

// Edit and void share the server's 1-day window.
function canModify(receipt: ReplacementReceipt) {
  return Date.now() - new Date(receipt.createdAt).getTime() <= VOID_WINDOW_MS;
}

/**
 * Full audit view of one purchase return: what went back, what the supplier
 * has sent in its place (every receipt), and what's still outstanding.
 * Fetches its own copy of the return so it refreshes right after a receipt
 * is recorded or voided.
 */
export function ReturnDetailSheet({
  purchaseReturnId,
  onOpenChange,
}: {
  purchaseReturnId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!purchaseReturnId;
  const { data: purchaseReturn, isLoading } = usePurchaseReturn(purchaseReturnId ?? undefined);
  const { data: receipts, isLoading: receiptsLoading } = useReplacementReceipts(purchaseReturnId ?? undefined);
  const voidReceipt = useVoidReplacementReceipt();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [voiding, setVoiding] = useState<ReplacementReceipt | null>(null);
  const [editing, setEditing] = useState<ReplacementReceipt | null>(null);

  const progress = purchaseReturn ? replacementProgress(purchaseReturn) : null;

  function confirmVoid() {
    if (!voiding) return;
    voidReceipt.mutate(voiding.id, {
      onSuccess: () => {
        toast.success(`Receipt ${voiding.replacementNumber} voided — stock and supplier balance reverted`);
        setVoiding(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          title="Return details"
          className="flex h-full w-full max-w-full flex-col gap-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-2xl sm:p-6"
        >
          <SheetHeader className="pr-10">
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <Undo2 className="size-5 text-muted-foreground" />
              {purchaseReturn?.returnNumber ?? 'Return'}
            </SheetTitle>
            {purchaseReturn && (
              <p className="break-words text-sm text-muted-foreground">
                {purchaseReturn.supplier?.name ?? '—'} · {formatDate(purchaseReturn.returnDate)} ·{' '}
                {purchaseReturn.purchase ? (
                  <Link
                    href={`/admin/purchases/${purchaseReturn.purchase.id}`}
                    className="text-primary hover:underline"
                  >
                    {purchaseReturn.purchase.invoiceNumber}
                  </Link>
                ) : (
                  'Standalone'
                )}
              </p>
            )}
          </SheetHeader>

          {isLoading || !purchaseReturn || !progress ? (
            <div className="mt-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {/* Summary first — the answer to "where does this return stand?" */}
              <section className="space-y-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    Received{' '}
                    <strong>
                      {progress.received}/{progress.returned}
                    </strong>{' '}
                    units
                  </span>
                  <ReplacementStatusBadge status={purchaseReturn.replacementStatus} />
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-border"
                  role="progressbar"
                  aria-label="Replacement progress"
                  aria-valuemin={0}
                  aria-valuemax={progress.returned}
                  aria-valuenow={progress.received}
                >
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{
                      width: `${progress.returned > 0 ? Math.min(100, (progress.received / progress.returned) * 100) : 0}%`,
                    }}
                  />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Returned</dt>
                    <dd className="break-words font-semibold text-destructive">
                      −{formatCurrency(purchaseReturn.totalAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Replaced</dt>
                    <dd className="break-words font-semibold text-success">
                      +{formatCurrency(purchaseReturn.receivedAmount ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Outstanding</dt>
                    <dd className="break-words font-semibold">
                      {formatCurrency(
                        Math.max(0, Number(purchaseReturn.totalAmount) - Number(purchaseReturn.receivedAmount ?? 0)),
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="break-words text-xs">
                  <span className="text-muted-foreground">Reason: </span>
                  {purchaseReturn.reason}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Returned lines</h3>
                <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Returned</TableHead>
                        <TableHead className="text-right">Unit cost</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseReturn.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-normal break-words">
                            {item.product?.name ?? item.productId}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell className="text-right">{item.receivedQuantity ?? 0}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.remainingQuantity ?? item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-2 sm:hidden">
                  {purchaseReturn.items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words text-sm font-medium">
                          {item.product?.name ?? item.productId}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          @ {formatCurrency(item.unitCost)}
                        </span>
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Returned</dt>
                          <dd className="font-medium">{item.quantity}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Received</dt>
                          <dd className="font-medium">{item.receivedQuantity ?? 0}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Remaining</dt>
                          <dd className="font-semibold">{item.remainingQuantity ?? item.quantity}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold">Replacement history</h3>
                  {!progress.isFull && (
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setReceiveOpen(true)}>
                      <PackageCheck />
                      Receive replacement
                    </Button>
                  )}
                </div>
                {receiptsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : !receipts || receipts.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No replacement received yet.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {receipts.map((receipt) => (
                      <li key={receipt.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words font-medium">{receipt.replacementNumber}</p>
                            <p className="break-words text-xs text-muted-foreground">
                              {formatDate(receipt.receivedDate)}
                              {receipt.reference ? ` · Ref ${receipt.reference}` : ''}
                              {receipt.admin?.name ? ` · by ${receipt.admin.name}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 font-semibold text-success">
                            +{formatCurrency(receipt.totalAmount)}
                          </span>
                        </div>
                        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                          {receipt.items.map((item) => (
                            <li key={item.id} className="break-words">
                              {item.product?.name ?? item.productId} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                        {receipt.notes && (
                          <p className="mt-1 break-words text-xs italic text-muted-foreground">{receipt.notes}</p>
                        )}
                        {canModify(receipt) && (
                          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditing(receipt)}>
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setVoiding(receipt)}
                            >
                              <Ban className="size-3.5" />
                              Void
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {progress.hasReceipts && (
                <p className="text-xs text-muted-foreground">
                  This return has replacement receipts, so it can no longer be edited or deleted.
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ReplacementReceiptFormDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        purchaseReturn={purchaseReturn ?? null}
      />

      <ReplacementReceiptFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        purchaseReturn={purchaseReturn ?? null}
        editingReceipt={editing}
      />

      <AlertDialog open={!!voiding} onOpenChange={(o) => !o && setVoiding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void {voiding?.replacementNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {voiding ? formatCurrency(voiding.totalAmount) : ''} receipt: the units come back out of
              stock and the value is taken off the supplier balance again. If those units were already sold, voiding
              will fail. Only possible within 1 day of recording.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVoid}
              disabled={voidReceipt.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
