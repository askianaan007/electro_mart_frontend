'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/loading-state';
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
import { PaymentStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { SalesReturnFormDialog } from '@/components/admin/sales-return-form-dialog';
import { InvoicePrintLayout } from '@/components/invoice-print-layout';
import { FitToWidth } from '@/components/fit-to-width';
import { useInvoice } from '@/hooks/use-invoices';
import { useDeleteSalesReturn, useSalesReturnsForOrder } from '@/hooks/use-sales-returns';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { SalesReturn } from '@/lib/api/types';
import { PrintButton } from '@/components/print-button';

const RETURN_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function canEditReturn(salesReturn: SalesReturn) {
  return Date.now() - new Date(salesReturn.createdAt).getTime() <= RETURN_EDIT_WINDOW_MS;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<SalesReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<SalesReturn | null>(null);

  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(id);
  const { data: salesReturns, isLoading: returnsLoading } = useSalesReturnsForOrder(invoice?.orderId);
  const deleteSalesReturn = useDeleteSalesReturn();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" backHref="/admin/invoices" backLabel="Invoices" />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !invoice) {
    return <PageSkeleton cards={0} />;
  }

  function confirmDeleteReturn() {
    if (!deletingReturn) return;
    deleteSalesReturn.mutate(
      { id: deletingReturn.id, orderId: deletingReturn.orderId },
      {
        onSuccess: () => toast.success('Return deleted — stock and dealer credit reversed'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setDeletingReturn(null);
  }

  const isFullyPaid = invoice.paymentStatus === 'PAID' || Number(invoice.netGrandTotal ?? invoice.grandTotal) <= 0;
  const returnedAmount = Number(invoice.returnedAmount ?? 0);
  const hasReturns = returnedAmount > 0;
  const netGrandTotal = invoice.netGrandTotal ?? invoice.grandTotal;

  return (
    <div className="space-y-6">
      <div className="space-y-1 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-2 h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft />
          Back
        </Button>
        <PageHeader
          title={invoice.invoiceNumber}
          description={
            <>
              {invoice.dealer?.businessName ?? '—'} &middot; Issued {formatDate(invoice.createdAt)}
            </>
          }
          meta={<PaymentStatusBadge status={invoice.paymentStatus} />}
          actions={
            <>
              {invoice.order?.status === 'COMPLETED' && (
                <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
                  <Undo2 />
                  Record Return
                </Button>
              )}
              <PrintButton />
              {!isFullyPaid && (
                <Button onClick={() => setPaymentOpen(true)}>
                  <Wallet />
                  Record Payment
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-2.5 print:border-0 print:bg-transparent print:p-0 sm:p-8">
        <FitToWidth>
          <InvoicePrintLayout invoice={invoice} />
        </FitToWidth>
      </div>

      {hasReturns && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Totals after returns</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grand Total</span>
              <span className="tabular-nums">{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Returned</span>
              <span className="tabular-nums">−{formatCurrency(returnedAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>Net Due</span>
              <span className="tabular-nums">{formatCurrency(netGrandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="overflow-hidden print:hidden">
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Payments recorded against this invoice.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-success">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.reference ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y divide-border border-t border-border lg:hidden">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{formatDate(payment.paymentDate)}</div>
                    <div className="mt-0.5 break-words text-xs text-muted-foreground">
                      {payment.mode.replace('_', ' ')} &middot; {payment.reference ?? '—'}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-success">
                    {formatCurrency(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden print:hidden">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>Returns</CardTitle>
            <CardDescription>Goods returned against this invoice&apos;s order.</CardDescription>
          </div>
          {salesReturns && salesReturns.length > 0 && (
            <Badge variant="warning">
              {salesReturns.length} return{salesReturns.length === 1 ? '' : 's'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {returnsLoading ? (
            <div className="space-y-2 p-4 pt-0 sm:p-5 sm:pt-0">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !salesReturns || salesReturns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="No returns yet"
              description="Goods the dealer sends back will appear here"
            />
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
                    {salesReturns.map((salesReturn) => (
                      <TableRow key={salesReturn.id}>
                        <TableCell className="font-medium">{salesReturn.returnNumber}</TableCell>
                        <TableCell className="whitespace-normal break-words">
                          {formatDate(salesReturn.returnDate)}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">{salesReturn.reason}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-destructive">
                          −{formatCurrency(salesReturn.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {canEditReturn(salesReturn) && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Edit return"
                                onClick={() => setEditingReturn(salesReturn)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="Delete return"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletingReturn(salesReturn)}
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
              <div className="space-y-3 p-4 pt-0 lg:hidden">
                {salesReturns.map((salesReturn) => (
                  <div key={salesReturn.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words font-medium">{salesReturn.returnNumber}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-destructive">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(salesReturn.returnDate)}</div>
                    <p className="mt-2 break-words text-sm">{salesReturn.reason}</p>
                    {canEditReturn(salesReturn) && (
                      <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Edit return"
                          onClick={() => setEditingReturn(salesReturn)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Delete return"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingReturn(salesReturn)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} invoice={invoice} />
      <SalesReturnFormDialog open={returnFormOpen} onOpenChange={setReturnFormOpen} orderId={invoice.orderId} />
      <SalesReturnFormDialog
        open={!!editingReturn}
        onOpenChange={(open) => !open && setEditingReturn(null)}
        orderId={editingReturn?.orderId ?? null}
        editingReturn={editingReturn}
      />

      <AlertDialog open={!!deletingReturn} onOpenChange={(open) => !open && setDeletingReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this return?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently reverses return {deletingReturn?.returnNumber} — removes the{' '}
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''} restocked units and the dealer credit
              it created. Only available within 1 day of recording it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
              disabled={deleteSalesReturn.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
