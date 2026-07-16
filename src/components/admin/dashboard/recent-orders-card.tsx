import Link from 'next/link';
import { ArrowUpRight, PackageSearch } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { OrderStatusBadge } from '@/components/status-badge';
import { formatCurrency, initials } from '@/lib/utils';
import type { Order } from '@/lib/api/types';

export function RecentOrdersCard({ orders }: { orders: Order[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-5 pb-0 sm:p-6 sm:pb-0">
        <p className="text-sm font-semibold text-foreground">Recent Orders</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">View all</Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No orders yet" description="Dealer orders will appear here" />
      ) : (
        <>
          <div className="hidden p-2 sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-accent/60">
                    <TableCell className="whitespace-normal wrap-break-word">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                            {initials(order.dealer.businessName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{order.dealer.businessName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word text-right font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`/admin/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`}>
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 p-4 sm:hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:bg-accent/60"
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
    </div>
  );
}
