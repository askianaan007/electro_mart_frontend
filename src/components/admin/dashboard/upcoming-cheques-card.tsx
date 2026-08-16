'use client';

import Link from 'next/link';
import { ArrowUpRight, Banknote, Landmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { UpcomingCheque } from '@/lib/api/types';

function chequeDueLabel(daysUntilDue: number): { label: string; className: string } {
  if (daysUntilDue < 0) {
    return {
      label: `Overdue by ${Math.abs(daysUntilDue)}d`,
      className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-2xs font-extrabold',
    };
  }
  if (daysUntilDue === 0) {
    return {
      label: 'Due today',
      className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-2xs font-extrabold animate-pulse',
    };
  }
  if (daysUntilDue === 1) {
    return {
      label: 'Due tomorrow',
      className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-2xs font-bold',
    };
  }
  return {
    label: `in ${daysUntilDue}d`,
    className: 'bg-secondary/60 text-muted-foreground border-border/50 font-semibold',
  };
}

function ChequeDueBadge({ cheque }: { cheque: UpcomingCheque }) {
  const { label, className } = chequeDueLabel(cheque.daysUntilDue);
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs backdrop-blur-md', className)}>
      {label}
    </span>
  );
}

function EmptyCheques() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center gap-3.5 px-4 py-12 text-center select-none">
      <div className="relative flex size-16 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-transparent blur-md" />
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs">
          <Banknote className="size-7 text-primary/80" />
        </div>
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-bold text-foreground">No pending cheques due</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Supplier cheques queued for bank deposit will display here automatically.
        </p>
      </div>
      <Button size="sm" asChild className="mt-1 rounded-xl text-xs font-semibold shadow-xs">
        <Link href="/admin/credits">
          <Plus className="size-4" />
          Record a Cheque
        </Link>
      </Button>
    </div>
  );
}

export function UpcomingChequesCard({ cheques }: { cheques: UpcomingCheque[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-gradient-to-tr from-blue-500/10 to-transparent blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Landmark className="size-4.5 text-primary" />
            <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Upcoming Cheques
            </h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Supplier cheques queued for bank clearance
          </p>
        </div>

        <Button variant="ghost" size="sm" asChild className="rounded-full text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10">
          <Link href="/admin/credits" className="flex items-center gap-1">
            <span>View all</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {cheques.length === 0 ? (
        <EmptyCheques />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="relative z-10 hidden sm:block overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Supplier
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Reference
                  </TableHead>
                  <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Deposit Date
                  </TableHead>
                  <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {cheques.map((cheque) => (
                  <TableRow key={cheque.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-foreground">
                      <Link
                        href={`/admin/credits/${cheque.supplierId}`}
                        className="text-primary hover:underline hover:text-primary/80"
                      >
                        {cheque.supplierName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cheque.reference ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-foreground">
                      {formatCurrency(cheque.amount)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">
                      {formatDate(cheque.chequeDepositDate)}
                    </TableCell>
                    <TableCell>
                      <ChequeDueBadge cheque={cheque} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="relative z-10 space-y-3 sm:hidden">
            {cheques.map((cheque) => (
              <Link
                key={cheque.id}
                href={`/admin/credits/${cheque.supplierId}`}
                className="group block rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/40 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {cheque.supplierName}
                  </span>
                  <ChequeDueBadge cheque={cheque} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {cheque.reference ?? '—'} &middot; {formatDate(cheque.chequeDepositDate)}
                </p>
                <p className="mt-2 text-sm font-extrabold text-foreground">
                  {formatCurrency(cheque.amount)}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
