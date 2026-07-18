'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FastForward,
  Pencil,
  PackageCheck,
  Receipt,
  Trash2,
  Truck,
  Undo2,
  XCircle,
} from 'lucide-react';
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
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { RejectOrderDialog } from '@/components/admin/reject-order-dialog';
import { ApproveOrderDialog } from '@/components/admin/approve-order-dialog';
import { EditOrderItemsDialog } from '@/components/admin/edit-order-items-dialog';
import { SalesReturnFormDialog } from '@/components/admin/sales-return-form-dialog';
import { useCompleteOrderDirectly, useDeleteOrder, useOrder, useUpdateOrderStatus } from '@/hooks/use-orders';
import { useDeleteSalesReturn, useSalesReturnsForOrder } from '@/hooks/use-sales-returns';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { SalesReturn } from '@/lib/api/types';

const NEXT_STATUS: Record<string, 'PACKED' | 'DELIVERED' | 'COMPLETED' | undefined> = {
  APPROVED: 'PACKED',
  PACKED: 'DELIVERED',
  DELIVERED: 'COMPLETED',
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  PACKED: 'Mark as Packed',
  DELIVERED: 'Mark as Delivered',
  COMPLETED: 'Mark as Completed',
};

const RETURN_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function canEditReturn(salesReturn: SalesReturn) {
  return Date.now() - new Date(salesReturn.createdAt).getTime() <= RETURN_EDIT_WINDOW_MS;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<SalesReturn | null>(null);
  const [deletingReturn, setDeletingReturn] = useState<SalesReturn | null>(null);

  const { data: order, isLoading } = useOrder(id);
  const { data: salesReturns, isLoading: returnsLoading } = useSalesReturnsForOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const completeDirectly = useCompleteOrderDirectly();
  const deleteSalesReturn = useDeleteSalesReturn();

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full" />;
  }

  const returnedAmount = (salesReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const hasReturns = returnedAmount > 0;
  const netAfterReturns = Number(order.totalAmount) - returnedAmount;

  const creditExceeded =
    !order.dealer.unlimitedCredit &&
    Number(order.dealer.outstandingBalance) + Number(order.totalAmount) > Number(order.dealer.creditLimit);
  const nextStatus = NEXT_STATUS[order.status];

  function handleAdvance() {
    if (!nextStatus) return;
    updateStatus.mutate(
      { id, status: nextStatus },
      {
        onSuccess: () => toast.success(`Order marked as ${nextStatus.toLowerCase()}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function confirmComplete() {
    completeDirectly.mutate(id, {
      onSuccess: () => {
        toast.success('Order marked as completed');
        setCompleteOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setCompleteOpen(false);
      },
    });
  }

  function confirmDelete() {
    const hadInvoice = !!order!.invoice;
    deleteOrder.mutate(id, {
      onSuccess: () => {
        toast.success(hadInvoice ? 'Order deleted — stock and invoice reversed' : 'Order deleted');
        router.push('/admin/orders');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
            {hasReturns && (
              <Badge variant={netAfterReturns <= 0 ? 'destructive' : 'warning'}>
                {netAfterReturns <= 0 ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/admin/dealers/${order.dealer.id}`} className="text-primary hover:underline">
              {order.dealer.businessName}
            </Link>{' '}
            &middot; {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === 'PENDING_APPROVAL' && (
            <>
              <Button variant="outline" onClick={() => setEditItemsOpen(true)}>
                <Pencil />
                Edit Items
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <XCircle />
                Reject
              </Button>
              <Button variant="success" onClick={() => setApproveOpen(true)}>
                <CheckCircle2 />
                Approve
              </Button>
            </>
          )}
          {nextStatus && (
            <Button onClick={handleAdvance} loading={updateStatus.isPending}>
              {nextStatus === 'PACKED' && <PackageCheck />}
              {nextStatus === 'DELIVERED' && <Truck />}
              {nextStatus === 'COMPLETED' && <CheckCircle2 />}
              {NEXT_STATUS_LABEL[nextStatus]}
            </Button>
          )}
          {nextStatus && nextStatus !== 'COMPLETED' && (
            <Button variant="success" onClick={() => setCompleteOpen(true)}>
              <FastForward />
              Directly Completed
            </Button>
          )}
          {order.status === 'COMPLETED' && (
            <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
              <Undo2 />
              Record Return
            </Button>
          )}
          {order.invoice && (
            <Button variant="outline" asChild>
              <Link href={`/admin/invoices/${order.invoice.id}`}>
                <Receipt />
                View Invoice
              </Link>
            </Button>
          )}
          {order.invoice && (
            <Button variant="outline" asChild>
              <Link href={`/admin/orders/${id}/edit`}>
                <Pencil />
                Edit Order
              </Link>
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      {order.status === 'PENDING_APPROVAL' && (
        <Card>
          <CardHeader>
            <CardTitle>Dealer credit status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Credit Limit</p>
              <p className="font-medium">
                {order.dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(order.dealer.creditLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Outstanding</p>
              <p className="font-medium">{formatCurrency(order.dealer.outstandingBalance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">After This Order</p>
              <p className="font-medium">
                {formatCurrency(Number(order.dealer.outstandingBalance) + Number(order.totalAmount))}
              </p>
            </div>
            {creditExceeded && (
              <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm sm:col-span-3">
                <AlertTriangle className="size-4 shrink-0 text-warning-foreground" />
                This order would push the dealer over their credit limit.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty Requested</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Discount Allocated</TableHead>
                <TableHead>Net Unit Price</TableHead>
                <TableHead className="hidden sm:table-cell">Available Stock</TableHead>
                <TableHead>Net Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className={Number(item.allocatedDiscount) > 0 ? 'text-destructive' : undefined}>
                    {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                  </TableCell>
                  <TableCell>{formatCurrency(item.netUnitPrice)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{item.product.currentStock}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.netLineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Card className="w-full sm:w-72">
          <CardContent className="space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span>{formatCurrency(order.discount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {hasReturns && (
              <>
                <div className="flex justify-between text-sm text-destructive">
                  <span>Returned</span>
                  <span>−{formatCurrency(returnedAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Net after returns</span>
                  <span>{formatCurrency(netAfterReturns)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
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

      <SalesReturnFormDialog open={returnFormOpen} onOpenChange={setReturnFormOpen} orderId={order.id} />
      <SalesReturnFormDialog
        open={!!editingReturn}
        onOpenChange={(open) => !open && setEditingReturn(null)}
        orderId={editingReturn?.orderId ?? null}
        editingReturn={editingReturn}
      />

      <RejectOrderDialog open={rejectOpen} onOpenChange={setRejectOpen} orderId={id} />
      <ApproveOrderDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        orderId={id}
        subtotal={order.subtotal}
      />
      <EditOrderItemsDialog open={editItemsOpen} onOpenChange={setEditItemsOpen} order={order} />

      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this order as completed directly?</AlertDialogTitle>
            <AlertDialogDescription>
              This skips the remaining Packed/Delivered steps and marks the order Completed right away — applying
              the same stock, invoice, and dealer balance updates as completing it normally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={completeDirectly.isPending}>
              Complete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              {order.invoice
                ? `This reverses the stock it reserved${order.status === 'COMPLETED' ? ", the dealer's balance, " : ' '}and deletes its invoice (${order.invoice.invoiceNumber}) — freeing that number for reuse only if it's still the most recently issued one. Blocked if a payment has already been recorded, or if a newer invoice has since been issued.`
                : 'This order has no invoice yet, so nothing else needs to be reversed.'}{' '}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
