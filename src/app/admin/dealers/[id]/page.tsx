'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Eraser,
  KeyRound,
  Loader2,
  Pencil,
  Receipt,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { formatCurrency, formatDate } from '@/lib/utils';

function TabLoader() {
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
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
        toast.success('Dealer deleted');
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
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{dealer.businessName}</h1>
              <AccountStatusBadge status={dealer.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {dealer.ownerName} &middot; @{dealer.username} &middot; {dealer.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetPassword} loading={resetPassword.isPending}>
            <KeyRound />
            Reset password
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setClearDataOpen(true)}
          >
            <Eraser />
            Clear all data
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit dealer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Credit Limit"
          value={dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(dealer.creditLimit)}
          icon={Wallet}
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

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            Order History
            {ordersFetching && !ordersLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {invoicesFetching && !invoicesLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payment History
            {paymentsFetching && !paymentsLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {ordersLoading ? (
                <TabLoader />
              ) : !orders || orders.data.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="No orders yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary">
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {invoicesLoading ? (
                <TabLoader />
              ) : !invoices || invoices.data.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.data.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-primary">
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(invoice.grandTotal)}</TableCell>
                        <TableCell>
                          <PaymentStatusBadge status={invoice.paymentStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {paymentsLoading ? (
                <TabLoader />
              ) : !payments || payments.data.length === 0 ? (
                <EmptyState icon={Wallet} title="No payments recorded yet" />
              ) : (
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
                    {payments.data.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                        <TableCell>{payment.reference ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DealerFormDialog open={editOpen} onOpenChange={setEditOpen} dealer={dealer} />

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Dealer credentials">
          <DialogHeader>
            <DialogTitle>Dealer credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the dealer. This password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono text-sm">{credentials.username}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Temporary password</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dealer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {dealer.businessName}&apos;s account. This only works if the dealer has no
              orders, invoices, payments, or return records — otherwise deactivate the account instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteDealer.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={clearDataOpen}
        onOpenChange={(open) => {
          setClearDataOpen(open);
          if (!open) setClearPassword('');
        }}
      >
        <DialogContent title="Clear dealer data">
          <DialogHeader>
            <DialogTitle>Clear all data for {dealer.businessName}?</DialogTitle>
            <DialogDescription>
              This permanently deletes every order, invoice, payment, and sales return for this dealer, and reverses
              the stock those orders reserved back to what purchases established. The dealer&apos;s profile,
              username, and credit terms are kept — only their transaction history is wiped. Suppliers, purchases,
              investments, and expenses are never touched.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            This cannot be undone. Enter your admin password to confirm.
          </div>
          <div className="space-y-2">
            <Label htmlFor="clear-data-password">Your password</Label>
            <Input
              id="clear-data-password"
              type="password"
              autoComplete="current-password"
              value={clearPassword}
              onChange={(e) => setClearPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && clearPassword) confirmClearData();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDataOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearData}
              disabled={!clearPassword}
              loading={clearDealerData.isPending}
            >
              Clear all data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
