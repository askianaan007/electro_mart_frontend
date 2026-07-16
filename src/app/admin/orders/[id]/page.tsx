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
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { RejectOrderDialog } from '@/components/admin/reject-order-dialog';
import { ApproveOrderDialog } from '@/components/admin/approve-order-dialog';
import { EditOrderItemsDialog } from '@/components/admin/edit-order-items-dialog';
import { useCompleteOrderDirectly, useDeleteOrder, useOrder, useUpdateOrderStatus } from '@/hooks/use-orders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const completeDirectly = useCompleteOrderDirectly();

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full" />;
  }

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
          {order.invoice && (
            <Button variant="outline" asChild>
              <Link href={`/admin/invoices/${order.invoice.id}`}>
                <Receipt />
                View Invoice
              </Link>
            </Button>
          )}
          {order.status !== 'COMPLETED' && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
          )}
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
                <TableHead className="hidden sm:table-cell">Available Stock</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="hidden sm:table-cell">{item.product.currentStock}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
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
          </CardContent>
        </Card>
      </div>

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
                ? 'This reverses the stock it reserved and deletes its invoice. Blocked if any payment has already been recorded against it.'
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
    </div>
  );
}
