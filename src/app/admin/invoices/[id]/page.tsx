'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Printer, Trash2, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
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
import { useInvoice } from '@/hooks/use-invoices';
import { useDeleteSalesReturn, useSalesReturnsForOrder } from '@/hooks/use-sales-returns';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { SalesReturn } from '@/lib/api/types';

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

  const { data: invoice, isLoading } = useInvoice(id);
  const { data: salesReturns, isLoading: returnsLoading } = useSalesReturnsForOrder(invoice?.orderId);
  const deleteSalesReturn = useDeleteSalesReturn();

  if (isLoading || !invoice) {
    return <Skeleton className="h-96 w-full" />;
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

  const isFullyPaid = invoice.paymentStatus === 'PAID';
  const returnedAmount = Number(invoice.returnedAmount ?? 0);
  const hasReturns = returnedAmount > 0;
  const netGrandTotal = invoice.netGrandTotal ?? invoice.grandTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={invoice.paymentStatus} />
          {invoice.order?.status === 'COMPLETED' && (
            <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
              <Undo2 />
              Record Return
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          {!isFullyPaid && (
            <Button onClick={() => setPaymentOpen(true)}>
              <Wallet />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 print:overflow-visible print:bg-transparent print:p-0 sm:p-8">
        <InvoicePrintLayout invoice={invoice} />
      </div>

      {hasReturns && (
        <Card className="print:hidden">
          <CardContent className="grid gap-2 p-6 sm:max-w-xs sm:ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grand Total</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Returned</span>
              <span>−{formatCurrency(returnedAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Net Due</span>
              <span>{formatCurrency(netGrandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-medium">Payment history</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>{payment.reference ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Returns</CardTitle>
          {salesReturns && salesReturns.length > 0 && (
            <Badge variant="warning">
              {salesReturns.length} return{salesReturns.length === 1 ? '' : 's'}
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
          ) : !salesReturns || salesReturns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="No returns yet"
              description="Goods the dealer sends back will appear here"
            />
          ) : (
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
                    <TableCell className="whitespace-normal break-words">{formatDate(salesReturn.returnDate)}</TableCell>
                    <TableCell className="whitespace-normal break-words">{salesReturn.reason}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      −{formatCurrency(salesReturn.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {canEditReturn(salesReturn) && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingReturn(salesReturn)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
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
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''} restocked units and the dealer
              credit it created. Only available within 1 day of recording it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
