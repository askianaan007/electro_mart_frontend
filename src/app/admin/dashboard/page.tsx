'use client';

import Link from 'next/link';
import {
  IndianRupee,
  ShoppingCart,
  ClipboardCheck,
  AlertTriangle,
  Wallet,
  PackageSearch,
  Undo2,
  Truck,
  Landmark,
  TrendingUp,
  Receipt,
  CreditCard,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrderStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { TopProductsList } from '@/components/admin/top-products-list';
import { RecentActivityFeed } from '@/components/admin/recent-activity-feed';
import { WalletCard } from '@/components/wallet-card';
import { useAdminDashboard } from '@/hooks/use-dashboard';
import { useActivityLog } from '@/hooks/use-activity-log';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();
  const { data: activity, isLoading: activityLoading } = useActivityLog({ page: 1, limit: 6 });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LayoutDashboard className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Snapshot of today&apos;s business</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <WalletCard
            label="Liquid Cash"
            value={formatCurrency(data.liquidCash)}
            subtitle="Investments + collections − supplier payments − expenses"
            tone="cash"
            mask="CASH"
          />
          <WalletCard
            label="Credit Balance"
            value={formatCurrency(data.creditBalance)}
            subtitle="Total owed to suppliers across all purchases"
            tone="liability"
            mask="OWED"
          />
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Today's Sales" value={formatCurrency(data.todaysSales)} icon={IndianRupee} />
          <StatCard label="Today's Orders" value={data.todaysOrders} icon={ShoppingCart} />
          <StatCard
            label="Pending Approvals"
            value={data.pendingApprovals}
            icon={ClipboardCheck}
            tone={data.pendingApprovals > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Out of Stock Items"
            value={data.outOfStockItems}
            icon={AlertTriangle}
            tone={data.outOfStockItems > 0 ? 'destructive' : 'default'}
          />
          <StatCard label="Outstanding Payments" value={formatCurrency(data.outstandingPayments)} icon={Wallet} />
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Net Sales"
            value={formatCurrency(data.netSales)}
            icon={IndianRupee}
            change={data.netSalesChangePct}
            changeLabel="vs Last Month"
          />
          <StatCard
            label="Total Sales Return"
            value={formatCurrency(data.totalSalesReturn)}
            icon={Undo2}
            change={data.totalSalesReturnChangePct}
            changeLabel="vs Last Month"
          />
          <StatCard
            label="Net Purchase"
            value={formatCurrency(data.netPurchase)}
            icon={Truck}
            change={data.netPurchaseChangePct}
            changeLabel="vs Last Month"
          />
          <StatCard
            label="Total Purchase Return"
            value={formatCurrency(data.totalPurchaseReturn)}
            icon={Undo2}
            change={data.totalPurchaseReturnChangePct}
            changeLabel="vs Last Month"
          />
          <StatCard label="Net Cash Flow" value={formatCurrency(data.netCashFlow)} icon={Landmark} hint="Net" />
          <StatCard
            label="Profit"
            value={formatCurrency(data.profit)}
            icon={TrendingUp}
            change={data.profitChangePct}
            changeLabel="vs Last Month"
            href="/admin/equity"
          />
          <StatCard
            label="Invoice Due"
            value={formatCurrency(data.invoiceDue)}
            icon={Receipt}
            href="/admin/invoices"
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(data.totalExpenses)}
            icon={CreditCard}
            change={data.totalExpensesChangePct}
            changeLabel="vs Last Month"
            href="/admin/expenses"
          />
          <StatCard
            label="Invoice Due Payments"
            value={formatCurrency(data.invoiceDuePayments)}
            icon={Wallet}
            change={data.invoiceDuePaymentsChangePct}
            changeLabel="Collected vs Last Month"
            href="/admin/payments"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <RevenueChart data={data.monthlyRevenue} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <TopProductsList items={data.topProducts} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {isLoading || !data ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.recentOrders.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No orders yet" description="Dealer orders will appear here" />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Dealer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((order) => (
                        <TableRow key={order.id} className="cursor-pointer">
                          <TableCell className="whitespace-normal wrap-break-word">
                            <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary">
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-normal wrap-break-word">{order.dealer.businessName}</TableCell>
                          <TableCell className="whitespace-normal wrap-break-word text-right">
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

                <div className="space-y-3 p-4 sm:hidden">
                  {data.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="wrap-break-word font-medium text-primary">{order.orderNumber}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 wrap-break-word text-sm text-muted-foreground">{order.dealer.businessName}</p>
                      <p className="mt-2 wrap-break-word text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <RecentActivityFeed items={activity?.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
