'use client';

import Link from 'next/link';
import { Wallet, CreditCard, ClipboardList, Receipt, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerDashboardPage() {
  const { data, isLoading } = useDealerDashboard();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user?.businessName ?? 'Dealer'}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s your account summary</p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Outstanding Balance" value={formatCurrency(data.outstandingBalance)} icon={Wallet} tone="warning" />
          <StatCard
            label="Credit Available"
            value={data.unlimitedCredit ? 'Unlimited' : formatCurrency(data.creditRemaining)}
            icon={CreditCard}
          />
          <StatCard label="Pending Orders" value={data.pendingOrders} icon={ClipboardList} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dealer/products">
            <ShoppingBag />
            Browse Products
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dealer/orders">View My Orders</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dealer/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {isLoading || !data ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.recentOrders.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No orders yet" description="Browse products to place your first order" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/dealer/orders/${order.id}`} className="font-medium text-primary">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
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

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dealer/invoices">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {isLoading || !data ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.recentInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(invoice.createdAt)}</TableCell>
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
      </div>
    </div>
  );
}
