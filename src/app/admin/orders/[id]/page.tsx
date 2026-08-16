'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FastForward,
  PackageCheck,
  Pencil,
  Receipt,
  ShoppingCart,
  Trash2,
  Truck,
  Undo2,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';
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

  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const { data: salesReturns, isLoading: returnsLoading } = useSalesReturnsForOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const completeDirectly = useCompleteOrderDirectly();
  const deleteSalesReturn = useDeleteSalesReturn();

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  if (isLoading || !order) {
    return <Skeleton className="h-96 w-full rounded-3xl" />;
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
    <div className="space-y-6 select-none">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2 rounded-full font-bold text-xs hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Orders</span>
      </Button>

      {/* Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Order #{order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
            {hasReturns && (
              <Badge
                variant={netAfterReturns <= 0 ? 'destructive' : 'warning'}
                className="rounded-full px-2.5 py-0.5 font-black text-xs shadow-2xs"
              >
                {netAfterReturns <= 0 ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 sm:text-sm">
            <User className="size-3.5 text-muted-foreground/70" />
            <Link href={`/admin/dealers/${order.dealer.id}`} className="text-primary font-bold hover:underline">
              {order.dealer.businessName}
            </Link>
            <span>&middot;</span>
            <span>Created on {formatDate(order.createdAt)}</span>
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'PENDING_APPROVAL' && (
            <>
              <Button variant="outline" onClick={() => setEditItemsOpen(true)} className="rounded-2xl font-semibold backdrop-blur-md">
                <Pencil className="size-4" />
                <span>Edit Items</span>
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)} className="rounded-2xl font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10">
                <XCircle className="size-4" />
                <span>Reject</span>
              </Button>
              <Button variant="success" onClick={() => setApproveOpen(true)} className="rounded-2xl font-bold shadow-md">
                <CheckCircle2 className="size-4" />
                <span>Approve Order</span>
              </Button>
            </>
          )}
          {nextStatus && (
            <Button onClick={handleAdvance} loading={updateStatus.isPending} className="rounded-2xl font-bold shadow-md">
              {nextStatus === 'PACKED' && <PackageCheck className="size-4" />}
              {nextStatus === 'DELIVERED' && <Truck className="size-4" />}
              {nextStatus === 'COMPLETED' && <CheckCircle2 className="size-4" />}
              <span>{NEXT_STATUS_LABEL[nextStatus]}</span>
            </Button>
          )}
          {nextStatus && nextStatus !== 'COMPLETED' && (
            <Button variant="success" onClick={() => setCompleteOpen(true)} className="rounded-2xl font-bold">
              <FastForward className="size-4" />
              <span>Directly Completed</span>
            </Button>
          )}
          {order.status === 'COMPLETED' && (
            <Button variant="outline" onClick={() => setReturnFormOpen(true)} className="rounded-2xl font-semibold backdrop-blur-md">
              <Undo2 className="size-4" />
              <span>Record Return</span>
            </Button>
          )}
          {order.invoice && (
            <Button variant="outline" asChild className="rounded-2xl font-semibold backdrop-blur-md">
              <Link href={`/admin/invoices/${order.invoice.id}`}>
                <Receipt className="size-4" />
                <span>View Invoice</span>
              </Link>
            </Button>
          )}
          {order.invoice && (
            <Button variant="outline" asChild className="rounded-2xl font-semibold backdrop-blur-md">
              <Link href={`/admin/orders/${id}/edit`}>
                <Pencil className="size-4" />
                <span>Edit Order</span>
              </Link>
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="rounded-2xl font-bold">
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Order Status Timeline Panel */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl p-6 shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />
        <OrderTimeline order={order} />
      </div>

      {/* Credit Status Warning Card (if PENDING_APPROVAL) */}
      {order.status === 'PENDING_APPROVAL' && (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-2xl space-y-3 shadow-2xs">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Dealer Credit Evaluation
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Credit Limit</p>
              <p className="font-extrabold text-foreground text-sm mt-0.5">
                {order.dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(order.dealer.creditLimit)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Outstanding</p>
              <p className="font-extrabold text-foreground text-sm mt-0.5">{formatCurrency(order.dealer.outstandingBalance)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/50 p-3">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Projected Total After Order</p>
              <p className="font-extrabold text-primary text-sm mt-0.5">
                {formatCurrency(Number(order.dealer.outstandingBalance) + Number(order.totalAmount))}
              </p>
            </div>
          </div>
          {creditExceeded && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Credit Alert: This order exceeds the dealer&apos;s allocated credit limit.</span>
            </div>
          )}
        </div>
      )}

      {/* Order Line Items Table */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-md">
        <div className="p-4 sm:p-6 border-b border-border/50">
          <h2 className="text-base font-extrabold text-foreground">Order Line Items ({order.items.length})</h2>
        </div>
        <div className="overflow-x-auto p-4 sm:p-6 pt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Product
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Qty Requested
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Unit Price
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Allocated Discount
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Net Unit Price
                  </TableHead>
                  <TableHead className="hidden font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Available Stock
                  </TableHead>
                  <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Line Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {order.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-xs text-foreground">{item.product.name}</TableCell>
                    <TableCell className="font-extrabold text-xs text-foreground">{item.quantity} units</TableCell>
                    <TableCell className="font-medium text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className={cn('font-bold text-xs', Number(item.allocatedDiscount) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                      {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                    </TableCell>
                    <TableCell className="font-bold text-xs text-foreground">{formatCurrency(item.netUnitPrice)}</TableCell>
                    <TableCell className="hidden font-semibold text-xs text-muted-foreground sm:table-cell">
                      {item.product.currentStock} in stock
                    </TableCell>
                    <TableCell className="text-right font-black text-xs sm:text-sm text-foreground">
                      {formatCurrency(item.netLineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Totals Summary Box */}
      <div className="flex justify-end">
        <div className="w-full sm:w-80 rounded-3xl border border-border/60 bg-card/80 p-5 backdrop-blur-2xl space-y-3 shadow-md">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Gross Subtotal</span>
            <span className="font-bold text-foreground">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Allocated Discount</span>
            <span className="font-bold text-foreground">−{formatCurrency(order.discount)}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 font-black text-sm text-foreground">
            <span>Order Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
          {hasReturns && (
            <>
              <div className="flex justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-1">
                <span>Returned Goods</span>
                <span>−{formatCurrency(returnedAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-black text-sm text-emerald-600 dark:text-emerald-400">
                <span>Net After Returns</span>
                <span>{formatCurrency(netAfterReturns)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sales Returns Section */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-md">
        <div className="p-4 sm:p-6 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">Sales Returns ({salesReturns?.length ?? 0})</h2>
          {salesReturns && salesReturns.length > 0 && (
            <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs font-black">
              {salesReturns.length} return record{salesReturns.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
        <div className="p-4 sm:p-6 pt-2">
          {returnsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : !salesReturns || salesReturns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="No returns recorded"
              description="Goods returned by the dealer against this order will display here"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent border-border/60">
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Return #
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Return Date
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Reason / Note
                    </TableHead>
                    <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Returned Value
                    </TableHead>
                    <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {salesReturns.map((salesReturn) => (
                    <TableRow key={salesReturn.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-xs text-foreground">{salesReturn.returnNumber}</TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {formatDate(salesReturn.returnDate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground max-w-xs break-words">
                        {salesReturn.reason}
                      </TableCell>
                      <TableCell className="text-right font-black text-xs text-rose-600 dark:text-rose-400">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditReturn(salesReturn) && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingReturn(salesReturn)} className="size-8 rounded-xl hover:bg-muted">
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-8 rounded-xl text-rose-600 hover:bg-rose-500/10"
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
          )}
        </div>
      </div>

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
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Mark this order as completed directly?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This skips remaining Packed/Delivered steps and completes the order right away — applying the same stock,
              invoice, and dealer balance updates as standard workflow completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete} disabled={completeDirectly.isPending} className="rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700">
              Complete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Delete this order?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {order.invoice
                ? `Reverses stock reservation, dealer balance, and deletes invoice (${order.invoice.invoiceNumber}). Blocked if payments exist.`
                : 'This order has no invoice yet.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteOrder.isPending}
              className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingReturn} onOpenChange={(open) => !open && setDeletingReturn(null)}>
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Delete this return?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Permanently reverses return {deletingReturn?.returnNumber} ({deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''}) — removing restocked stock and dealer credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
              disabled={deleteSalesReturn.isPending}
              className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
