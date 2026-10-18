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
import { PageHeader } from '@/components/page-header';
import { QueryErrorState } from '@/components/query-error-state';
import { TableSkeleton } from '@/components/loading-state';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDealerDashboard();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.businessName ?? 'Dealer'}`}
        description="Here's your account summary, recent orders and invoices."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dealer/orders">View My Orders</Link>
            </Button>
            <Button asChild>
              <Link href="/dealer/products">
                <ShoppingBag />
                Browse Products
              </Link>
            </Button>
          </>
        }
      />

      {isError ? (
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load your dashboard" />
        </Card>
      ) : (
        <>
          {isLoading || !data ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label="Outstanding Balance"
                value={formatCurrency(data.outstandingBalance)}
                icon={Wallet}
                tone="warning"
              />
              <StatCard
                label="Credit Available"
                value={data.unlimitedCredit ? 'Unlimited' : formatCurrency(data.creditRemaining)}
                icon={CreditCard}
              />
              <StatCard label="Pending Orders" value={data.pendingOrders} icon={ClipboardList} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="min-w-0 truncate">Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" className="shrink-0" asChild>
                  <Link href="/dealer/orders">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                {isLoading || !data ? (
                  <TableSkeleton rows={3} className="pt-0 sm:pt-0" />
                ) : data.recentOrders.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No orders yet"
                    description="Browse products to place your first order"
                  />
                ) : (
                  <>
                    <div className="hidden lg:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <Link
                                  href={`/dealer/orders/${order.id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {order.orderNumber}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatCurrency(order.totalAmount)}
                              </TableCell>
                              <TableCell>
                                <OrderStatusBadge status={order.status} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ul className="divide-y divide-border border-t border-border lg:hidden">
                      {data.recentOrders.map((order) => (
                        <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 space-y-1">
                            <Link
                              href={`/dealer/orders/${order.id}`}
                              className="block break-words font-medium text-primary hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="min-w-0 truncate">Recent Invoices</CardTitle>
                <Button variant="ghost" size="sm" className="shrink-0" asChild>
                  <Link href="/dealer/invoices">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0 sm:p-0">
                {isLoading || !data ? (
                  <TableSkeleton rows={3} className="pt-0 sm:pt-0" />
                ) : data.recentInvoices.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No invoices yet"
                    description="Invoices appear here once your orders are billed"
                  />
                ) : (
                  <>
                    <div className="hidden lg:block">
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
                              <TableCell className="text-muted-foreground">{formatDate(invoice.createdAt)}</TableCell>
                              <TableCell>
                                <PaymentStatusBadge status={invoice.paymentStatus} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ul className="divide-y divide-border border-t border-border lg:hidden">
                      {data.recentInvoices.map((invoice) => (
                        <li key={invoice.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="break-words font-medium text-foreground">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</p>
                          </div>
                          <div className="shrink-0">
                            <PaymentStatusBadge status={invoice.paymentStatus} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
