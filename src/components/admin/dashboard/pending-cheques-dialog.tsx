'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, Clock, Landmark, Loader2, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaginationBar } from '@/components/pagination-bar';
import { usePayments } from '@/hooks/use-payments';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const PAGE_SIZE = 8;

function getChequeHeatmap(chequeDateStr?: string | null) {
  if (!chequeDateStr) {
    return {
      status: 'pending',
      label: 'Date Pending',
      daysDiff: 0,
      badgeClass: 'bg-muted/60 text-muted-foreground border-border/50',
      tileClass: 'border-border/60 bg-background/50',
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
      badgeClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 font-black',
      tileClass: 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20',
      dotColor: 'bg-rose-500',
    };
  }

  if (diffDays === 0) {
    return {
      status: 'today',
      label: 'DUE TODAY',
      daysDiff: diffDays,
      badgeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-black',
      tileClass: 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20',
      dotColor: 'bg-amber-500',
    };
  }

  if (diffDays <= 3) {
    return {
      status: 'soon',
      label: `In ${diffDays} day${diffDays === 1 ? '' : 's'} (Soon)`,
      daysDiff: diffDays,
      badgeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-extrabold',
      tileClass: 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20',
      dotColor: 'bg-emerald-500',
    };
  }

  if (diffDays <= 7) {
    return {
      status: 'upcoming',
      label: `In ${diffDays} days`,
      daysDiff: diffDays,
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold',
      tileClass: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10',
      dotColor: 'bg-emerald-400',
    };
  }

  return {
    status: 'future',
    label: `In ${diffDays} days`,
    daysDiff: diffDays,
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-medium',
    tileClass: 'border-border/60 bg-background/50',
    dotColor: 'bg-teal-400',
  };
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

  const { data, isLoading, isFetching } = usePayments(
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
        className="sm:max-w-3xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Specular Shimmer Top Curve Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:from-white/10" />

        {/* Dialog Header */}
        <DialogHeader className="relative z-10 space-y-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs">
              <Clock className="size-4.5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
              Pending Dealer Cheques Deposit Heatmap
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Cheques awaiting bank clearance color-coded from upcoming deposit dates (green) to overdue deposit alerts (red)
          </DialogDescription>
        </DialogHeader>

        {/* Total & Heatmap Summary Bar */}
        <div className="relative z-10 my-2 rounded-2xl border border-border/60 bg-muted/40 p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 shadow-2xs">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Awaiting Clearance
            </p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {formatCurrency(totalAmount)}
              </p>
              {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-primary" />}
            </div>
          </div>

          {/* Heatmap Legend Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-black text-rose-600 dark:text-rose-400">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span>{overdueCount} Overdue</span>
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>{dueSoonCount} Due Soon</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-extrabold text-foreground backdrop-blur-md">
              <span>{data?.meta.total ?? 0} Total Cheques</span>
            </span>
          </div>
        </div>

        {/* Cheques Breakdown List */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
              ))}
            </div>
          ) : cheques.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-8 text-center backdrop-blur-md">
              <p className="text-sm font-bold text-foreground">No Pending Cheques</p>
              <p className="text-xs text-muted-foreground mt-1">Every dealer cheque on record has already cleared.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <table className="w-full min-w-[650px] text-xs">
                  <thead className="bg-muted/60 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Deposit Status</th>
                      <th className="px-4 py-3 text-left">Dealer / Owner</th>
                      <th className="px-4 py-3 text-left">Cheque / Bank</th>
                      <th className="px-4 py-3 text-left">Deposit Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {cheques.map((payment) => {
                      const heat = getChequeHeatmap(payment.chequeDate);
                      return (
                        <tr key={payment.id} className={cn('transition-colors hover:bg-muted/30', heat.tileClass)}>
                          {/* Heatmap Badge Column */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]', heat.badgeClass)}>
                              <span className={cn('size-2 rounded-full', heat.dotColor)} />
                              <span>{heat.label}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                                {(payment.dealer?.businessName ?? '—').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate text-xs sm:text-sm">
                                  {payment.dealer?.businessName ?? '—'}
                                </p>
                                {payment.dealer?.ownerName && (
                                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                    <User className="size-3 text-muted-foreground/70" />
                                    <span>{payment.dealer.ownerName}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Landmark className="size-3 text-muted-foreground/70" />
                              {payment.chequeNumber ?? '—'}
                              {payment.bankName ? ` · ${payment.bankName}` : ''}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-bold whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Calendar className="size-3 text-muted-foreground" />
                              {payment.chequeDate ? formatDate(payment.chequeDate) : '—'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-black text-blue-600 dark:text-blue-400">
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/dealers/${payment.dealerId}`}
                              onClick={() => onOpenChange(false)}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                            >
                              <span>Profile</span>
                              <ArrowUpRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Heatmap Cards View */}
              <div className="space-y-3 sm:hidden">
                {cheques.map((payment) => {
                  const heat = getChequeHeatmap(payment.chequeDate);
                  return (
                    <div
                      key={payment.id}
                      className={cn(
                        'rounded-2xl border p-3.5 backdrop-blur-md space-y-3 shadow-2xs transition-all',
                        heat.tileClass
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]', heat.badgeClass)}>
                          <span className={cn('size-1.5 rounded-full', heat.dotColor)} />
                          <span>{heat.label}</span>
                        </span>

                        <Link
                          href={`/admin/dealers/${payment.dealerId}`}
                          onClick={() => onOpenChange(false)}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary border border-primary/20 shrink-0"
                        >
                          <span>View</span>
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted border border-border/60 text-muted-foreground font-bold text-xs shrink-0">
                          {(payment.dealer?.businessName ?? '—').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">
                            {payment.dealer?.businessName ?? '—'}
                          </p>
                          {payment.chequeDate && (
                            <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Calendar className="size-3" />
                              Deposit: {formatDate(payment.chequeDate)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                        <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                          <Landmark className="size-3 text-muted-foreground/70" />
                          {payment.chequeNumber ?? '—'}
                          {payment.bankName ? ` · ${payment.bankName}` : ''}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-black text-blue-600 dark:text-blue-400">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {data && data.meta.totalPages > 1 && (
          <div className="relative z-10 shrink-0 pt-2">
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
