'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Receipt, ShoppingCart, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AccountStatusBadge, OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { DealerFormDialog } from '@/components/admin/dealer-form-dialog';
import { useDealer } from '@/hooks/use-dealers';
import { useOrders } from '@/hooks/use-orders';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data: dealer, isLoading } = useDealer(id);
  const { data: orders } = useOrders({ dealerId: id, limit: 10 });
  const { data: invoices } = useInvoices({ dealerId: id, limit: 10 });
  const { data: payments } = usePayments({ dealerId: id, limit: 10 });

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
        <Button onClick={() => setEditOpen(true)}>
          <Pencil />
          Edit dealer
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Credit Limit" value={formatCurrency(dealer.creditLimit)} icon={Wallet} />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(dealer.outstandingBalance)}
          icon={Wallet}
          tone={Number(dealer.outstandingBalance) > 0 ? 'warning' : 'default'}
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
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {!orders || orders.data.length === 0 ? (
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
              {!invoices || invoices.data.length === 0 ? (
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
              {!payments || payments.data.length === 0 ? (
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
    </div>
  );
}
