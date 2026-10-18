'use client';

import Link from 'next/link';
import { ArrowUpRight, Banknote, Plus } from 'lucide-react';
import { PanelTitle } from '@/components/admin/dashboard/panel-icon';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SectionHeader } from '@/components/section-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UpcomingCheque } from '@/lib/api/types';

function chequeDueLabel(daysUntilDue: number): { label: string; variant: BadgeProps['variant'] } {
  if (daysUntilDue < 0) {
    return { label: `Overdue by ${Math.abs(daysUntilDue)}d`, variant: 'destructive' };
  }
  if (daysUntilDue === 0) {
    return { label: 'Due today', variant: 'destructive' };
  }
  if (daysUntilDue === 1) {
    return { label: 'Due tomorrow', variant: 'warning' };
  }
  return { label: `in ${daysUntilDue}d`, variant: 'muted' };
}

function ChequeDueBadge({ cheque }: { cheque: UpcomingCheque }) {
  const { label, variant } = chequeDueLabel(cheque.daysUntilDue);
  return <Badge variant={variant}>{label}</Badge>;
}

export function UpcomingChequesCard({ cheques }: { cheques: UpcomingCheque[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title={
          <PanelTitle icon={Banknote} tone="info">
            Upcoming Cheques
          </PanelTitle>
        }
        description={<span className="sm:pl-[42px]">Supplier cheques queued for bank clearance</span>}
        className="pb-3"
        actions={
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
            <Link href="/admin/credits">
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {cheques.length === 0 ? (
        <div className="m-4 mt-1 flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:m-5 sm:mt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-xs">
              <Banknote className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No pending cheques due</p>
              <p className="text-xs text-muted-foreground">
                Supplier cheques queued for bank deposit will display here automatically.
              </p>
            </div>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/admin/credits">
              <Plus />
              Record a Cheque
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden border-t border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Deposit Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cheques.map((cheque) => (
                  <TableRow key={cheque.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/credits/${cheque.supplierId}`} className="text-primary hover:underline">
                        {cheque.supplierName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{cheque.reference ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(cheque.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(cheque.chequeDepositDate)}</TableCell>
                    <TableCell>
                      <ChequeDueBadge cheque={cheque} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 px-4 pb-4 sm:hidden">
            {cheques.map((cheque) => (
              <Link
                key={cheque.id}
                href={`/admin/credits/${cheque.supplierId}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{cheque.supplierName}</span>
                  <ChequeDueBadge cheque={cheque} />
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {cheque.reference ?? '—'} &middot; {formatDate(cheque.chequeDepositDate)}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground tabular-nums">{formatCurrency(cheque.amount)}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
