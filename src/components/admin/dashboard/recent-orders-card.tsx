'use client';

import Link from 'next/link';
import { ArrowUpRight, PackageSearch, ShoppingBag } from 'lucide-react';
import { PanelTitle } from '@/components/admin/dashboard/panel-icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { SectionHeader } from '@/components/section-header';
import { OrderStatusBadge } from '@/components/status-badge';
import { formatCurrency, initials } from '@/lib/utils';
import type { Order } from '@/lib/api/types';

export function RecentOrdersCard({ orders }: { orders: Order[] }) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title={
          <PanelTitle icon={ShoppingBag} tone="purple">
            Recent Orders
          </PanelTitle>
        }
        description={<span className="sm:pl-[42px]">Latest dealer orders and fulfillment state</span>}
        className="pb-3"
        actions={
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
            <Link href="/admin/orders">
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No orders recorded yet" description="Dealer orders will display here automatically" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden border-t border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="group/row">
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                            {initials(order.dealer.businessName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{order.dealer.businessName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
                        asChild
                      >
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

          {/* Mobile cards */}
          <div className="space-y-3 px-4 pb-4 sm:hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-[colors,transform] hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-medium text-primary">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{order.dealer.businessName}</p>
                <p className="mt-2 text-sm font-medium text-foreground tabular-nums">{formatCurrency(order.totalAmount)}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
