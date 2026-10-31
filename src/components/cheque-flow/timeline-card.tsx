'use client';

import { TriangleAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDay, formatShortDay } from '@/lib/cheque-flow';
import { cn, formatCurrency } from '@/lib/utils';
import type { ChequeFlowTimelineDay } from '@/lib/api/types';

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatCurrency(Math.abs(v))}`;

/** Day by day: pending cheques expected in and out, and the running net from the 1st. */
export function TimelineCard({ days, periodLabel }: { days: ChequeFlowTimelineDay[]; periodLabel: string }) {
  const shortfalls = days.filter((d) => d.shortfall);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <header className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Payment timing — {periodLabel}</h3>
        <p className="text-xs text-muted-foreground">
          Pending cheques by date, with the running net from the start of the month.
        </p>
        {shortfalls.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/[0.07] px-2.5 py-1.5 text-xs font-medium text-destructive">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            Supplier payments fall before enough customer receipts on {shortfalls.length} day
            {shortfalls.length === 1 ? '' : 's'} — first on {formatDay(shortfalls[0].date)}.
          </p>
        )}
      </header>
      {days.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No pending cheques this month.</p>
      ) : (
        <>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Expected in</TableHead>
                  <TableHead className="text-right">Expected out</TableHead>
                  <TableHead className="text-right">Day net</TableHead>
                  <TableHead className="text-right">Running net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.date} className={cn(d.shortfall && 'bg-destructive/[0.06] hover:bg-destructive/10')}>
                    <TableCell className="whitespace-nowrap">
                      {formatDay(d.date)}
                      {d.shortfall && (
                        <span className="ml-2 text-[11px] font-medium text-destructive">Payments before receipts</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {d.receipts ? formatCurrency(d.receipts) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-warning-foreground dark:text-warning">
                      {d.payments ? formatCurrency(d.payments) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{signed(d.net)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        d.cumulative < 0 ? 'text-destructive' : 'text-success',
                      )}
                    >
                      {signed(d.cumulative)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y sm:hidden">
            {days.map((d) => (
              <li key={d.date} className={cn('px-4 py-2.5 text-sm', d.shortfall && 'bg-destructive/[0.06]')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{formatShortDay(d.date)}</span>
                  <span
                    className={cn('font-semibold tabular-nums', d.cumulative < 0 ? 'text-destructive' : 'text-success')}
                  >
                    {signed(d.cumulative)}
                  </span>
                </div>
                <div className="mt-0.5 flex justify-between gap-2 text-xs tabular-nums text-muted-foreground">
                  <span className="text-success">In {d.receipts ? formatCurrency(d.receipts) : '—'}</span>
                  <span className="text-warning-foreground dark:text-warning">
                    Out {d.payments ? formatCurrency(d.payments) : '—'}
                  </span>
                </div>
                {d.shortfall && (
                  <p className="mt-0.5 text-[11px] font-medium text-destructive">Payments before receipts</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
