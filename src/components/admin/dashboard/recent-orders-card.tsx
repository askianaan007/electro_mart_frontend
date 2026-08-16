'use client';

import Link from 'next/link';
import { ArrowUpRight, PackageSearch, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { OrderStatusBadge } from '@/components/status-badge';
import { formatCurrency, initials } from '@/lib/utils';
import type { Order } from '@/lib/api/types';

export function RecentOrdersCard({ orders }: { orders: Order[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-gradient-to-tr from-cyan-500/10 to-transparent blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Title & Actions */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4.5 text-primary" />
              <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                Recent Orders
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Latest dealer orders and fulfillment state
            </p>
          </div>

          <Button variant="ghost" size="sm" asChild className="rounded-full text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10">
            <Link href="/admin/orders" className="flex items-center gap-1">
              <span>View all</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* Content Body */}
        {orders.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No orders recorded yet" description="Dealer orders will display here automatically" />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="relative z-10 hidden sm:block overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent border-border/60">
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Order #
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Dealer
                    </TableHead>
                    <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/50">
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs font-extrabold text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 border border-primary/20 shadow-xs">
                            <AvatarFallback className="bg-primary/15 text-[10px] font-extrabold text-primary">
                              {initials(order.dealer.businessName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs font-bold text-foreground">
                            {order.dealer.businessName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-xl hover:bg-primary/15 hover:text-primary transition-all"
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

            {/* Mobile Cards View */}
            <div className="relative z-10 space-y-3 sm:hidden">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="group block rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/40 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-extrabold text-primary group-hover:underline">
                      {order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-medium">
                    {order.dealer.businessName}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-foreground">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
