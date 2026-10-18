'use client';

import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Coins, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { formatCurrency } from '@/lib/utils';
import type { AdminDashboardSummary } from '@/lib/api/types';

function DealerMonogram({ name }: { name: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function OutstandingPaymentsDialog({
  open,
  onOpenChange,
  dealers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealers: AdminDashboardSummary['outstandingByDealer'];
}) {
  const total = dealers.reduce((sum, d) => sum + Number(d.outstandingBalance), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Outstanding payments breakdown"
        className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Coins className="size-4" />
            </div>
            <DialogTitle>Outstanding Dealer Payments</DialogTitle>
          </div>
          <DialogDescription>
            Detailed breakdown of unsettled accounts receivable grouped by dealer
          </DialogDescription>
        </DialogHeader>

        {/* Total summary */}
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Total Combined Receivables</p>
            <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">{formatCurrency(total)}</p>
          </div>
          <Badge variant="outline" className="tabular-nums">
            {dealers.length} {dealers.length === 1 ? 'Dealer' : 'Dealers'}
          </Badge>
        </div>

        {/* Dealer list */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {dealers.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Outstanding Payments"
              description="All dealer accounts are currently fully settled."
              className="py-10"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
                <Table className="min-w-[550px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer / Owner</TableHead>
                      <TableHead>Contact Phone</TableHead>
                      <TableHead className="text-right">Outstanding Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealers.map((dealer) => (
                      <TableRow key={dealer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <DealerMonogram name={dealer.businessName} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{dealer.businessName}</p>
                              {dealer.ownerName && <div className="text-xs text-muted-foreground">{dealer.ownerName}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dealer.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3" />
                              {dealer.phone}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(dealer.outstandingBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/dealers/${dealer.id}`} onClick={() => onOpenChange(false)}>
                              Profile
                              <ArrowUpRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {dealers.map((dealer) => (
                  <div key={dealer.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <DealerMonogram name={dealer.businessName} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{dealer.businessName}</p>
                          {dealer.ownerName && <p className="text-xs text-muted-foreground">{dealer.ownerName}</p>}
                        </div>
                      </div>

                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <Link href={`/admin/dealers/${dealer.id}`} onClick={() => onOpenChange(false)}>
                          View
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      </Button>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs">
                      {dealer.phone ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="size-3" />
                          {dealer.phone}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {formatCurrency(dealer.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
