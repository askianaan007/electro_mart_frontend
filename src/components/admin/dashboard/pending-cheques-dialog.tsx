'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, CheckCircle2, Clock, Landmark, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { QueryErrorState } from '@/components/query-error-state';
import { usePayments } from '@/hooks/use-payments';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const PAGE_SIZE = 8;

function getChequeHeatmap(chequeDateStr?: string | null) {
  if (!chequeDateStr) {
    return {
      status: 'pending',
      label: 'Date Pending',
      daysDiff: 0,
      badgeClass: 'border-border bg-muted text-muted-foreground',
      tileClass: 'border-border',
      dotColor: 'bg-muted-foreground',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(chequeDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      status: 'overdue',
      label: `OVERDUE (${daysAgo}d ago)`,
      daysDiff: diffDays,
      badgeClass: 'border-destructive/20 bg-destructive/10 text-destructive',
      tileClass: 'border-destructive/25 bg-destructive/5',
      dotColor: 'bg-destructive',
    };
  }

  if (diffDays === 0) {
    return {
      status: 'today',
      label: 'DUE TODAY',
      daysDiff: diffDays,
      badgeClass: 'border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning',
      tileClass: 'border-warning/25 bg-warning/5',
      dotColor: 'bg-warning',
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'soon',
      label: `In ${diffDays} day${diffDays === 1 ? '' : 's'} (Soon)`,
      daysDiff: diffDays,
      badgeClass: 'border-success/20 bg-success/10 text-success',
      tileClass: 'border-success/20 bg-success/5',
      dotColor: 'bg-success',
    };
  }

  if (diffDays <= 7) {
    return {
      status: 'upcoming',
      label: `In ${diffDays} days`,
      daysDiff: diffDays,
      badgeClass: 'border-success/20 bg-success/10 text-success',
      tileClass: 'border-border',
      dotColor: 'bg-success/60',
    };
  }

  return {
    status: 'future',
    label: `In ${diffDays} days`,
    daysDiff: diffDays,
    badgeClass: 'border-info/20 bg-info/10 text-info',
    tileClass: 'border-border',
    dotColor: 'bg-info',
  };
}

/** Desktop rows only get a tint for the states that need attention. */
const ROW_TINT: Record<string, string> = {
  overdue: 'bg-destructive/5',
  today: 'bg-warning/5',
  soon: 'bg-success/5',
};

function DealerMonogram({ name }: { name: string }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function HeatBadge({ heat, compact = false }: { heat: ReturnType<typeof getChequeHeatmap>; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        heat.badgeClass,
      )}
    >
      <span className={cn('rounded-full', compact ? 'size-1.5' : 'size-2', heat.dotColor)} />
      {heat.label}
    </span>
  );
}

export function PendingChequesDialog({
  open,
  onOpenChange,
  totalAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  const { data, isLoading, isFetching, isError, error, refetch } = usePayments(
    { mode: 'CHEQUE', chequeStatus: 'PENDING', sortBy: 'chequeDate', page, limit: PAGE_SIZE },
    { enabled: open },
  );
  const cheques = data?.data ?? [];

  // Calculate heatmap summary metrics
  let overdueCount = 0;
  let dueSoonCount = 0;

  cheques.forEach((payment) => {
    const heat = getChequeHeatmap(payment.chequeDate);
    if (heat.status === 'overdue') overdueCount++;
    else if (heat.status === 'today' || heat.status === 'soon') dueSoonCount++;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Pending dealer cheques breakdown"
        className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl"
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-4" />
            </div>
            <DialogTitle>Pending Dealer Cheques Deposit Heatmap</DialogTitle>
          </div>
          <DialogDescription>
            Cheques awaiting bank clearance color-coded from upcoming deposit dates (green) to overdue deposit alerts (red)
          </DialogDescription>
        </DialogHeader>

        {/* Total & heatmap summary */}
        <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Awaiting Clearance</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatCurrency(totalAmount)}
              </p>
              {isFetching && !isLoading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="tabular-nums">
                <span className="size-1.5 rounded-full bg-destructive" />
                {overdueCount} Overdue
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge variant="success" className="tabular-nums">
                <span className="size-1.5 rounded-full bg-success" />
                {dueSoonCount} Due Soon
              </Badge>
            )}
            <Badge variant="outline" className="tabular-nums">
              {data?.meta.total ?? 0} Total Cheques
            </Badge>
          </div>
        </div>

        {/* Cheque list */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} className="py-10" />
          ) : cheques.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Cheques"
              description="Every dealer cheque on record has already cleared."
              className="py-10"
            />
          ) : (
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deposit Status</TableHead>
                      <TableHead>Dealer / Owner</TableHead>
                      <TableHead>Cheque / Bank</TableHead>
                      <TableHead>Deposit Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cheques.map((payment) => {
                      const heat = getChequeHeatmap(payment.chequeDate);
                      return (
                        <TableRow key={payment.id} className={ROW_TINT[heat.status]}>
                          <TableCell>
                            <HeatBadge heat={heat} />
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <DealerMonogram name={payment.dealer?.businessName ?? '—'} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {payment.dealer?.businessName ?? '—'}
                                </p>
                                {payment.dealer?.ownerName && (
                                  <div className="text-xs text-muted-foreground">{payment.dealer.ownerName}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Landmark className="size-3" />
                              {payment.chequeNumber ?? '—'}
                              {payment.bankName ? ` · ${payment.bankName}` : ''}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Calendar className="size-3 text-muted-foreground" />
                              {payment.chequeDate ? formatDate(payment.chequeDate) : '—'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(payment.amount)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/dealers/${payment.dealerId}`} onClick={() => onOpenChange(false)}>
                                Profile
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {cheques.map((payment) => {
                  const heat = getChequeHeatmap(payment.chequeDate);
                  return (
                    <div key={payment.id} className={cn('space-y-3 rounded-lg border bg-card p-4', heat.tileClass)}>
                      <div className="flex items-center justify-between gap-2">
                        <HeatBadge heat={heat} compact />
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <Link href={`/admin/dealers/${payment.dealerId}`} onClick={() => onOpenChange(false)}>
                            View
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <DealerMonogram name={payment.dealer?.businessName ?? '—'} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {payment.dealer?.businessName ?? '—'}
                          </p>
                          {payment.chequeDate && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              Deposit: {formatDate(payment.chequeDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Landmark className="size-3" />
                          {payment.chequeNumber ?? '—'}
                          {payment.bankName ? ` · ${payment.bankName}` : ''}
                        </span>
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {data && data.meta.totalPages > 1 && (
          <div className="-mx-5 -mb-5 shrink-0 sm:-mx-6 sm:-mb-6">
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
