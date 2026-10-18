'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
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
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { StatCard } from '@/components/stat-card';
import { PageSkeleton, TableSkeleton } from '@/components/loading-state';
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

/** A header action group: two-column grid on phones (a lone last button spans both), inline row from sm. */
const ACTION_GRID =
  'grid grid-cols-2 gap-2 empty:hidden *:min-w-0 *:px-2.5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:flex sm:flex-wrap sm:items-center sm:*:px-4';

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
  const {
    data: salesReturns,
    isLoading: returnsLoading,
    isError: returnsIsError,
    error: returnsError,
    refetch: refetchReturns,
  } = useSalesReturnsForOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const completeDirectly = useCompleteOrderDirectly();
  const deleteSalesReturn = useDeleteSalesReturn();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order" onBack={() => router.back()} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !order) {
    return <PageSkeleton cards={4} />;
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
      <PageHeader
        title={`Order #${order.orderNumber}`}
        onBack={() => router.back()}
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            {hasReturns && (
              <Badge variant={netAfterReturns <= 0 ? 'destructive' : 'warning'}>
                {netAfterReturns <= 0 ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )}
          </>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Link href={`/admin/dealers/${order.dealer.id}`} className="font-medium text-primary hover:underline">
              {order.dealer.businessName}
            </Link>
            <span aria-hidden>&middot;</span>
            <span>Created on {formatDate(order.createdAt)}</span>
          </span>
        }
        actions={
          // Phones: workflow actions on top, everything else in a two-column grid.
          // From sm up it's a single row with the workflow actions last.
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className={ACTION_GRID}>
              {order.status === 'PENDING_APPROVAL' && (
                <>
                  <Button variant="outline" onClick={() => setEditItemsOpen(true)}>
                    <Pencil />
                    Edit Items
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRejectOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle />
                    Reject
                  </Button>
                </>
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
            <div className={cn(ACTION_GRID, 'order-first sm:order-none')}>
              {order.status === 'PENDING_APPROVAL' && (
                <Button variant="success" onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 />
                  Approve Order
                </Button>
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
            </div>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium text-muted-foreground">Customer</p>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-[18px]" />
            </div>
          </div>
          <Link
            href={`/admin/dealers/${order.dealer.id}`}
            className="mt-1 block truncate text-base font-semibold text-foreground hover:text-primary"
          >
            {order.dealer.businessName}
          </Link>
          {order.dealer.ownerName && <div className="truncate text-xs text-muted-foreground">{order.dealer.ownerName}</div>}
        </Card>
        <StatCard
          label="Order Total"
          value={formatCurrency(order.totalAmount)}
          icon={ShoppingCart}
          hint={`${order.items.length} line item${order.items.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Returned Goods"
          value={hasReturns ? `−${formatCurrency(returnedAmount)}` : formatCurrency(0)}
          icon={Undo2}
          tone={hasReturns ? 'destructive' : 'default'}
          hint={`${salesReturns?.length ?? 0} return record${(salesReturns?.length ?? 0) === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Net After Returns"
          value={formatCurrency(netAfterReturns)}
          icon={Receipt}
          tone="success"
          hint={order.invoice ? `Invoice ${order.invoice.invoiceNumber}` : 'No invoice yet'}
        />
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline order={order} />
        </CardContent>
      </Card>

      {/* Credit evaluation (pending approval only) */}
      {order.status === 'PENDING_APPROVAL' && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Dealer credit evaluation</CardTitle>
            <CardDescription>How approving this order affects the dealer&apos;s credit position.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Credit limit</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {order.dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(order.dealer.creditLimit)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Current outstanding</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(order.dealer.outstandingBalance)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Projected total after order</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(Number(order.dealer.outstandingBalance) + Number(order.totalAmount))}
                </p>
              </div>
            </div>
            {creditExceeded && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Credit alert: this order exceeds the dealer&apos;s allocated credit limit.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title={`Line items (${order.items.length})`} className="pb-4" />
        <div className="border-t border-border">
          <div className="hidden lg:block">
            <Table className="min-w-[650px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Requested</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Allocated Discount</TableHead>
                  <TableHead className="text-right">Net Unit Price</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Available Stock</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity} units</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        Number(item.allocatedDiscount) > 0 ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.netUnitPrice)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {item.product.currentStock} in stock
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(item.netLineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border lg:hidden">
            {order.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words font-medium text-foreground">{item.product.name}</div>
                    <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {item.quantity} units &times; {formatCurrency(item.netUnitPrice)}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {formatCurrency(item.netLineTotal)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
                  <span>Unit {formatCurrency(item.unitPrice)}</span>
                  <span>&middot;</span>
                  <span className={cn(Number(item.allocatedDiscount) > 0 && 'text-destructive')}>
                    Discount {Number(item.allocatedDiscount) > 0 ? `−${formatCurrency(item.allocatedDiscount)}` : '—'}
                  </span>
                  <span>&middot;</span>
                  <span>{item.product.currentStock} in stock</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t border-border p-4 sm:p-5">
          <dl className="w-full space-y-2 text-sm sm:w-80">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gross subtotal</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Allocated discount</dt>
              <dd className="font-medium tabular-nums text-foreground">−{formatCurrency(order.discount)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <dt>Order total</dt>
              <dd className="tabular-nums">{formatCurrency(order.totalAmount)}</dd>
            </div>
            {hasReturns && (
              <>
                <div className="flex justify-between pt-1 font-medium text-destructive">
                  <dt>Returned goods</dt>
                  <dd className="tabular-nums">−{formatCurrency(returnedAmount)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-success">
                  <dt>Net after returns</dt>
                  <dd className="tabular-nums">{formatCurrency(netAfterReturns)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Sales returns */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title={`Sales returns (${salesReturns?.length ?? 0})`}
          className="pb-4"
          actions={
            salesReturns && salesReturns.length > 0 ? (
              <Badge variant="warning">
                {salesReturns.length} return record{salesReturns.length === 1 ? '' : 's'}
              </Badge>
            ) : undefined
          }
        />
        <div className="border-t border-border">
          {returnsLoading ? (
            <TableSkeleton rows={2} />
          ) : returnsIsError ? (
            <QueryErrorState error={returnsError} onRetry={() => refetchReturns()} />
          ) : !salesReturns || salesReturns.length === 0 ? (
            <EmptyState
              icon={Undo2}
              title="No returns recorded"
              description="Goods returned by the dealer against this order will display here"
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Reason / Note</TableHead>
                      <TableHead className="text-right">Returned Value</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReturns.map((salesReturn) => (
                      <TableRow key={salesReturn.id}>
                        <TableCell className="font-medium text-foreground">{salesReturn.returnNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(salesReturn.returnDate)}</TableCell>
                        <TableCell className="max-w-xs whitespace-normal break-words">{salesReturn.reason}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-destructive">
                          −{formatCurrency(salesReturn.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEditReturn(salesReturn) && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Edit return"
                                onClick={() => setEditingReturn(salesReturn)}
                                className="size-8"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Delete return"
                                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
              <div className="space-y-3 p-4 lg:hidden">
                {salesReturns.map((salesReturn) => (
                  <div key={salesReturn.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words font-medium text-foreground">
                        {salesReturn.returnNumber}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-destructive">
                        −{formatCurrency(salesReturn.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{formatDate(salesReturn.returnDate)}</div>
                    <p className="mt-2 break-words text-sm">{salesReturn.reason}</p>
                    {canEditReturn(salesReturn) && (
                      <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit return"
                          onClick={() => setEditingReturn(salesReturn)}
                          className="size-9"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete return"
                          className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this order as completed directly?</AlertDialogTitle>
            <AlertDialogDescription>
              This skips remaining Packed/Delivered steps and completes the order right away — applying the same stock,
              invoice, and dealer balance updates as standard workflow completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              disabled={completeDirectly.isPending}
              className={buttonVariants({ variant: 'success' })}
            >
              Complete Order
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
                ? `Reverses stock reservation, dealer balance, and deletes invoice (${order.invoice.invoiceNumber}). Blocked if payments exist.`
                : 'This order has no invoice yet.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteOrder.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingReturn} onOpenChange={(open) => !open && setDeletingReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this return?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently reverses return {deletingReturn?.returnNumber} (
              {deletingReturn ? formatCurrency(deletingReturn.totalAmount) : ''}) — removing restocked stock and dealer
              credit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReturn}
              disabled={deleteSalesReturn.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete Return
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
