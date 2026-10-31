'use client';

import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Scale, TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import type { ChequeFlowSummary } from '@/lib/api/types';

function Card({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Clock;
  tone: 'in' | 'out';
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border bg-card p-3.5 shadow-xs sm:p-4',
        tone === 'in' ? 'border-success/25' : 'border-warning/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn('size-4 shrink-0', tone === 'in' ? 'text-success' : 'text-warning')} />
      </div>
      <p
        className={cn(
          'mt-1.5 break-words text-lg font-bold tabular-nums sm:text-xl',
          tone === 'in' ? 'text-success' : 'text-warning-foreground dark:text-warning',
        )}
      >
        {formatCurrency(value)}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const count = (n: number) => `${n} cheque${n === 1 ? '' : 's'}`;

export function SummaryCards({
  summary,
  filtered,
  periodLabel,
}: {
  summary: ChequeFlowSummary | undefined;
  filtered: boolean;
  periodLabel: string;
}) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className={cn('h-[92px] rounded-xl', i === 6 && 'col-span-2 lg:col-span-4')} />
        ))}
      </div>
    );
  }
  const { receivable: r, payable: p, netPending } = summary;
  const short = netPending < 0;
  const notCounted = (side: typeof r) =>
    side.bounced || side.cancelled
      ? `Not counted: bounced ${formatCurrency(side.bounced)}, cancelled ${formatCurrency(side.cancelled)}`
      : count(side.count);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Card label="Customer cheques — total" value={r.total} hint={notCounted(r)} icon={ArrowDownLeft} tone="in" />
        <Card label="Pending to receive" value={r.pending} hint={count(r.pendingCount)} icon={Clock} tone="in" />
        <Card label="Cleared receipts" value={r.cleared} hint={count(r.clearedCount)} icon={CheckCircle2} tone="in" />
        <Card label="Supplier cheques — total" value={p.total} hint={notCounted(p)} icon={ArrowUpRight} tone="out" />
        <Card label="Pending to pay" value={p.pending} hint={count(p.pendingCount)} icon={Clock} tone="out" />
        <Card label="Cleared payments" value={p.cleared} hint={count(p.clearedCount)} icon={CheckCircle2} tone="out" />
      </div>

      <div
        className={cn(
          'flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between',
          short ? 'border-destructive/40 bg-destructive/[0.06]' : 'border-success/40 bg-success/[0.06]',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-lg',
              short ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success',
            )}
          >
            {short ? <TriangleAlert className="size-5" /> : <Scale className="size-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {short ? 'Additional funds required' : 'Net pending cheque flow'}
              <span className="font-normal text-muted-foreground"> · {periodLabel}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Pending customer cheques − pending supplier cheques. Compares pending cheques only — it does not include
              your bank balance.
              {filtered && (
                <span className="font-medium text-warning-foreground dark:text-warning"> Filtered totals.</span>
              )}
            </p>
          </div>
        </div>
        <p
          className={cn(
            'shrink-0 text-2xl font-bold tabular-nums sm:text-right',
            short ? 'text-destructive' : 'text-success',
          )}
        >
          {netPending > 0 ? '+' : netPending < 0 ? '−' : ''}
          {formatCurrency(Math.abs(netPending))}
        </p>
      </div>
    </div>
  );
}
