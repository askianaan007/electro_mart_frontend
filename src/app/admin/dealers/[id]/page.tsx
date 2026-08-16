'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Eraser,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Phone,
  Receipt,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { DealerFormDialog } from '@/components/admin/dealer-form-dialog';
import { useClearDealerData, useDealer, useDeleteDealer, useResetDealerPassword } from '@/hooks/use-dealers';
import { useOrders } from '@/hooks/use-orders';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

function TabLoader() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-2xl" />
      ))}
    </div>
  );
}

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
  const {
    data: orders,
    isLoading: ordersLoading,
    isFetching: ordersFetching,
  } = useOrders({ dealerId: id, limit: 10 });
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
  } = useInvoices({ dealerId: id, limit: 10 });
  const {
    data: payments,
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
  } = usePayments({ dealerId: id, limit: 10 });

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  if (isLoading || !dealer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

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
    <div className="space-y-6 select-none">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="-ml-2 rounded-full font-bold text-xs hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        <span>Back to Dealers</span>
      </Button>

      {/* Profile Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-base shadow-xs shrink-0">
            {dealer.businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl truncate">
                {dealer.businessName}
              </h1>
              <AccountStatusBadge status={dealer.status} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2 flex-wrap">
              {dealer.ownerName && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <User className="size-3 text-muted-foreground/70" />
                  {dealer.ownerName}
                </span>
              )}
              <span>&middot;</span>
              <span>@{dealer.username}</span>
              {dealer.phone && (
                <>
                  <span>&middot;</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3 text-muted-foreground/70" />
                    {dealer.phone}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={resetPassword.isPending}
            className="rounded-2xl font-semibold backdrop-blur-md shadow-xs h-10"
          >
            <KeyRound className="size-4" />
            <span>Reset Password</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setClearDataOpen(true)}
            className="rounded-2xl font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 h-10"
          >
            <Eraser className="size-4" />
            <span>Clear All Data</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            className="rounded-2xl font-semibold border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 h-10"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </Button>

          <Button onClick={() => setEditOpen(true)} className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all h-10">
            <Pencil className="size-4" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Credit Limit"
          value={dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(dealer.creditLimit)}
          icon={CreditCard}
        />
        <StatCard
          label={Number(dealer.outstandingBalance) < 0 ? 'Credit Balance' : 'Outstanding Balance'}
          value={formatCurrency(Math.abs(Number(dealer.outstandingBalance)))}
          icon={Wallet}
          tone={
            Number(dealer.outstandingBalance) < 0
              ? 'success'
              : Number(dealer.outstandingBalance) > 0
                ? 'warning'
                : 'default'
          }
          hint={Number(dealer.outstandingBalance) < 0 ? 'From returned goods — usable on future orders' : undefined}
        />
        <StatCard label="Total Orders" value={dealer.summary.totalOrders} icon={ShoppingCart} />
        <StatCard
          label="Lifetime Completed Value"
          value={formatCurrency(dealer.summary.lifetimeCompletedValue)}
          icon={Receipt}
        />
      </div>

      {/* Tabs History Register */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="w-full justify-start rounded-2xl border border-border/60 bg-card/70 p-1.5 backdrop-blur-md h-auto gap-1">
          <TabsTrigger
            value="orders"
            className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs shrink-0"
          >
            <span>Order History</span>
            {ordersFetching && !ordersLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs shrink-0"
          >
            <span>Invoices</span>
            {invoicesFetching && !invoicesLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs shrink-0"
          >
            <span>Payment History</span>
            {paymentsFetching && !paymentsLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Orders History */}
        <TabsContent value="orders" className="mt-4">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-md">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

            {ordersLoading ? (
              <TabLoader />
            ) : !orders || orders.data.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No orders recorded yet" description="Orders placed by this dealer will display here" />
            ) : (
              <div className="overflow-x-auto p-4 sm:p-6">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/60">
                      <TableRow className="hover:bg-transparent border-border/60">
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Order #</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Total Amount</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {orders.data.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="font-black text-xs sm:text-sm text-foreground">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 hover:bg-primary/20"
                            >
                              <span>Details</span>
                              <ArrowUpRight className="size-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Invoices History */}
        <TabsContent value="invoices" className="mt-4">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-md">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

            {invoicesLoading ? (
              <TabLoader />
            ) : !invoices || invoices.data.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices generated yet" description="Invoices issued for completed orders will display here" />
            ) : (
              <div className="overflow-x-auto p-4 sm:p-6">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/60">
                      <TableRow className="hover:bg-transparent border-border/60">
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Invoice #</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Grand Total</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Payment Status</TableHead>
                        <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {invoices.data.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Link
                              href={`/admin/invoices/${invoice.id}`}
                              className="inline-flex items-center rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {formatDate(invoice.createdAt)}
                          </TableCell>
                          <TableCell className="font-black text-xs sm:text-sm text-foreground">
                            {formatCurrency(invoice.grandTotal)}
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={invoice.paymentStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/invoices/${invoice.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 hover:bg-primary/20"
                            >
                              <span>View</span>
                              <ArrowUpRight className="size-3" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Payments History */}
        <TabsContent value="payments" className="mt-4">
          <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-md">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

            {paymentsLoading ? (
              <TabLoader />
            ) : !payments || payments.data.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments recorded yet" description="Payments submitted by this dealer will display here" />
            ) : (
              <div className="overflow-x-auto p-4 sm:p-6">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                  <Table className="min-w-[600px]">
                    <TableHeader className="bg-muted/60">
                      <TableRow className="hover:bg-transparent border-border/60">
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Payment Date</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Payment Mode</TableHead>
                        <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">Reference / Cheque #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/50">
                      {payments.data.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="font-extrabold text-xs text-foreground uppercase tracking-wider">
                            {payment.mode.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="font-medium text-xs text-muted-foreground">
                            {payment.reference ?? payment.chequeNumber ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals & Dialogs */}
      <DealerFormDialog open={editOpen} onOpenChange={setEditOpen} dealer={dealer} />

      {/* Credentials Dialog */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Dealer Login Credentials" className="sm:max-w-md rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold">Dealer Login Credentials</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide these initial credentials to the dealer. The password cannot be retrieved again after closing.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3 my-2">
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">{credentials.username}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporary Password</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="font-mono font-extrabold text-sm text-primary">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                    className="size-8 rounded-xl hover:bg-muted"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCredentials(null)} className="w-full rounded-2xl font-bold">
              Done &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Delete this dealer account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This permanently deletes {dealer.businessName}&apos;s account. This is only permitted if the dealer has zero orders, invoices, or payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteDealer.isPending}
              className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
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
        <DialogContent title="Clear Dealer Data" className="sm:max-w-md rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold">Clear all data for {dealer.businessName}?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This permanently wipes every order, invoice, payment, and return record for this dealer, reversing stock reservations. The dealer&apos;s account profile remains intact.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 my-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>This action is irreversible. Enter your admin password to confirm.</span>
          </div>

          <div className="space-y-2 my-1">
            <Label htmlFor="clear-data-password" className="text-xs font-extrabold text-foreground">
              Admin Master Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="clear-data-password"
                type="password"
                placeholder="Enter password..."
                autoComplete="current-password"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                className="h-11 rounded-2xl border-border/60 bg-background/60 pl-10 text-xs font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && clearPassword) confirmClearData();
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setClearDataOpen(false)} className="rounded-2xl font-semibold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearData}
              disabled={!clearPassword || clearDealerData.isPending}
              className="rounded-2xl font-bold bg-rose-600 text-white hover:bg-rose-700"
            >
              {clearDealerData.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <span>Clear All Data</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
