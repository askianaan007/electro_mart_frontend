'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Copy,
  CreditCard,
  Eraser,
  KeyRound,
  Lock,
  Pencil,
  Phone,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AccountStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { PageSkeleton, TableSkeleton } from '@/components/loading-state';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { DealerFormDialog } from '@/components/admin/dealer-form-dialog';
import { useClearDealerData, useDealer, useDeleteDealer, useResetDealerPassword } from '@/hooks/use-dealers';
import { useOrders } from '@/hooks/use-orders';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { useDealerWallet } from '@/hooks/use-dealer-wallet';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const resetPassword = useResetDealerPassword();
  const deleteDealer = useDeleteDealer();
  const clearDealerData = useClearDealerData(id);

  const { data: dealer, isLoading, isError, error, refetch } = useDealer(id);
  const { data: wallet } = useDealerWallet(id);
  const {
    data: orders,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    isError: ordersIsError,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders({ dealerId: id, limit: 10 });
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    isError: invoicesIsError,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useInvoices({ dealerId: id, limit: 10 });
  const {
    data: payments,
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
    isError: paymentsIsError,
    error: paymentsError,
    refetch: refetchPayments,
  } = usePayments({ dealerId: id, limit: 10 });

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dealer" onBack={() => router.back()} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !dealer) {
    return <PageSkeleton cards={4} />;
  }

  // Owed (positive) or credit (negative), counting invoices of orders not completed yet.
  const balance = Number(dealer.balance ?? dealer.outstandingBalance);
  const pendingInvoices = Number(dealer.pendingInvoices ?? 0);
  // Extra money the dealer paid sits in the Wallet card, so it isn't shown here
  // again: this is only what's still owed on invoices (0 when they've paid ahead).
  const owed = wallet ? Math.round((balance + wallet.balance) * 100) / 100 : null;

  function handleResetPassword() {
    resetPassword.mutate(dealer!.id, {
      onSuccess: (result) =>
        setCredentials({ username: dealer!.username, temporaryPassword: result.temporaryPassword }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function confirmDelete() {
    deleteDealer.mutate(dealer!.id, {
      onSuccess: () => {
        toast.success('Dealer account deleted');
        router.push('/admin/dealers');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  function confirmClearData() {
    clearDealerData.mutate(clearPassword, {
      onSuccess: (result) => {
        toast.success(
          `Cleared ${result.orders} order(s), ${result.invoices} invoice(s), ${result.payments} payment(s), ${result.salesReturns} return(s)`,
        );
        setClearDataOpen(false);
        setClearPassword('');
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dealer.businessName}
        onBack={() => router.back()}
        meta={<AccountStatusBadge status={dealer.status} />}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {dealer.ownerName && (
              <span className="inline-flex items-center gap-1 text-foreground">
                <User className="size-3.5 text-muted-foreground" />
                {dealer.ownerName}
              </span>
            )}
            <span>&middot;</span>
            <span>@{dealer.username}</span>
            {dealer.phone && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {dealer.phone}
                </span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={handleResetPassword} loading={resetPassword.isPending}>
              {!resetPassword.isPending && <KeyRound />}
              Reset Password
            </Button>
            <Button
              variant="outline"
              onClick={() => setClearDataOpen(true)}
              className="border-warning/30 text-warning-foreground hover:bg-warning/10 dark:text-warning"
            >
              <Eraser />
              Clear All Data
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
              Delete
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit Profile
            </Button>
          </>
        }
      />

      <div
        className={cn('grid gap-4 sm:grid-cols-2', dealer.unlimitedCredit ? 'xl:grid-cols-4' : 'xl:grid-cols-5')}
      >
        {!dealer.unlimitedCredit && (
          <StatCard label="Credit Limit" value={formatCurrency(dealer.creditLimit)} icon={CreditCard} />
        )}
        <StatCard
          label={owed !== null && owed < 0 ? 'Credit Balance' : 'Outstanding Balance'}
          value={owed === null ? '—' : formatCurrency(Math.abs(owed))}
          icon={Wallet}
          tone={owed === null || owed === 0 ? 'default' : owed < 0 ? 'success' : 'warning'}
          hint={
            owed !== null && owed > 0 && pendingInvoices > 0
              ? `Includes invoices of orders not completed yet`
              : owed === 0 && (wallet?.balance ?? 0) > 0
                ? 'Nothing owed — the extra paid is in the Wallet'
                : undefined
          }
        />
        <StatCard
          label={(wallet?.balance ?? 0) < 0 ? 'Wallet overdrawn' : 'Wallet'}
          value={formatCurrency(Math.abs(wallet?.balance ?? 0))}
          icon={PiggyBank}
          tone={(wallet?.balance ?? 0) < 0 ? 'destructive' : (wallet?.balance ?? 0) > 0 ? 'success' : 'default'}
          hint={
            (wallet?.balance ?? 0) < 0
              ? 'A cheque that funded spent credit bounced — the dealer owes this'
              : (wallet?.pending ?? 0) > 0
                ? `${formatCurrency(wallet?.available ?? 0)} usable · ${formatCurrency(wallet?.pending ?? 0)} waiting for a cheque`
                : (wallet?.balance ?? 0) > 0
                  ? 'Usable on the next order or invoice'
                  : undefined
          }
        />
        <StatCard label="Total Orders" value={dealer.summary.totalOrders} icon={ShoppingCart} tone="info" />
        <StatCard
          label="Lifetime Completed Value"
          value={formatCurrency(dealer.summary.lifetimeCompletedValue)}
          icon={Receipt}
          tone="purple"
        />
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <SectionHeader
              title="Order history"
              description="Latest 10 orders placed by this dealer."
              isFetching={ordersFetching && !ordersLoading}
              className="pb-3"
            />
            {ordersLoading ? (
              <TableSkeleton rows={3} />
            ) : ordersIsError ? (
              <QueryErrorState error={ordersError} onRetry={() => refetchOrders()} />
            ) : !orders || orders.data.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No orders recorded yet" description="Orders placed by this dealer will display here" />
            ) : (
              <div className={cn('border-t border-border', ordersFetching && 'opacity-60 transition-opacity')}>
                <div className="hidden lg:block">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.data.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/orders/${order.id}`}>
                                Details
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-3 p-4 lg:hidden">
                  {orders.data.map((order) => (
                    <div key={order.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="min-w-0 break-words font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <OrderStatusBadge status={order.status} />
                        <Button asChild size="sm" variant="outline" className="h-9">
                          <Link href={`/admin/orders/${order.id}`}>
                            Details
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <SectionHeader
              title="Invoices"
              description="Latest 10 invoices issued to this dealer."
              isFetching={invoicesFetching && !invoicesLoading}
              className="pb-3"
            />
            {invoicesLoading ? (
              <TableSkeleton rows={3} />
            ) : invoicesIsError ? (
              <QueryErrorState error={invoicesError} onRetry={() => refetchInvoices()} />
            ) : !invoices || invoices.data.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices generated yet" description="Invoices issued for completed orders will display here" />
            ) : (
              <div className={cn('border-t border-border', invoicesFetching && 'opacity-60 transition-opacity')}>
                <div className="hidden lg:block">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.data.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Link
                              href={`/admin/invoices/${invoice.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(invoice.createdAt)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(invoice.grandTotal)}
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={invoice.paymentStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/invoices/${invoice.id}`}>
                                View
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-3 p-4 lg:hidden">
                  {invoices.data.map((invoice) => (
                    <div key={invoice.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="min-w-0 break-words font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatCurrency(invoice.grandTotal)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <PaymentStatusBadge status={invoice.paymentStatus} />
                        <Button asChild size="sm" variant="outline" className="h-9">
                          <Link href={`/admin/invoices/${invoice.id}`}>
                            View
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <SectionHeader
              title="Payment history"
              description="Latest 10 payments received from this dealer."
              isFetching={paymentsFetching && !paymentsLoading}
              className="pb-3"
            />
            {paymentsLoading ? (
              <TableSkeleton rows={3} />
            ) : paymentsIsError ? (
              <QueryErrorState error={paymentsError} onRetry={() => refetchPayments()} />
            ) : !payments || payments.data.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments recorded yet" description="Payments submitted by this dealer will display here" />
            ) : (
              <div className={cn('border-t border-border', paymentsFetching && 'opacity-60 transition-opacity')}>
                <div className="hidden lg:block">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Reference / Cheque #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.data.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-muted-foreground">{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-success">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.reference ?? payment.chequeNumber ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-border lg:hidden">
                  {payments.data.map((payment) => (
                    <li key={payment.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{formatDate(payment.paymentDate)}</div>
                        <div className="mt-0.5 break-words text-xs text-muted-foreground">
                          {payment.mode.replace('_', ' ')} &middot; {payment.reference ?? payment.chequeNumber ?? '—'}
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-success">
                        {formatCurrency(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="wallet">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <SectionHeader
              title="Wallet"
              description="Money paid above invoices (overpayments, returns on paid invoices), and where it was used."
              className="pb-3"
            />
            {!wallet ? (
              <TableSkeleton rows={3} />
            ) : wallet.sources.length === 0 && wallet.uses.length === 0 && wallet.refunded === 0 ? (
              <EmptyState
                icon={PiggyBank}
                title="Nothing in the wallet"
                description="When this dealer pays more than an invoice, the extra is kept here for their next purchase"
              />
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {wallet.sources.map((source) => (
                  <li key={`in-${source.invoiceId}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/invoices/${source.invoiceId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {source.invoiceNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Paid above the invoice
                        {source.pending > 0 && ` · ${formatCurrency(source.pending)} waiting for a cheque`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-success">
                      +{formatCurrency(source.excess)}
                    </span>
                  </li>
                ))}
                {wallet.standalone > 0 && (
                  <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <p className="text-sm text-foreground">Advance payments</p>
                    <span className="shrink-0 font-semibold tabular-nums text-success">
                      +{formatCurrency(wallet.standalone)}
                    </span>
                  </li>
                )}
                {wallet.uses.map((use) => (
                  <li key={use.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/invoices/${use.invoiceId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {use.invoiceNumber}
                      </Link>
                      <p className="break-words text-xs text-muted-foreground">
                        Used on {formatDate(use.createdAt)}
                        {use.note ? ` · ${use.note}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      −{formatCurrency(use.amount)}
                    </span>
                  </li>
                ))}
                {wallet.refunded > 0 && (
                  <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <p className="text-sm text-foreground">Refunded to the dealer</p>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">
                      −{formatCurrency(wallet.refunded)}
                    </span>
                  </li>
                )}
                <li className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3 sm:px-5">
                  <p className="text-sm font-semibold">{wallet.balance < 0 ? 'Overdrawn' : 'Balance'}</p>
                  <span
                    className={cn(
                      'shrink-0 font-semibold tabular-nums',
                      wallet.balance < 0 ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {formatCurrency(Math.abs(wallet.balance))}
                  </span>
                </li>
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DealerFormDialog open={editOpen} onOpenChange={setEditOpen} dealer={dealer} />

      {/* Credentials Dialog */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Dealer Login Credentials" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dealer Login Credentials</DialogTitle>
            <DialogDescription>
              Provide these initial credentials to the dealer. The password cannot be retrieved again after closing.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{credentials.username}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy password"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                    className="size-8"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCredentials(null)} className="w-full">
              Done &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dealer account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {dealer.businessName}&apos;s account. This is only permitted if the dealer has zero orders, invoices, or payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteDealer.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete Dealer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Data Confirmation Dialog */}
      <Dialog
        open={clearDataOpen}
        onOpenChange={(open) => {
          setClearDataOpen(open);
          if (!open) setClearPassword('');
        }}
      >
        <DialogContent title="Clear Dealer Data" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all data for {dealer.businessName}?</DialogTitle>
            <DialogDescription>
              This permanently wipes every order, invoice, payment, and return record for this dealer, reversing stock reservations. The dealer&apos;s account profile remains intact.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>This action is irreversible. Enter your admin password to confirm.</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clear-data-password">Admin Master Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="clear-data-password"
                type="password"
                placeholder="Enter password..."
                autoComplete="current-password"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && clearPassword) confirmClearData();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDataOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearData}
              disabled={!clearPassword || clearDealerData.isPending}
              loading={clearDealerData.isPending}
            >
              Clear All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
