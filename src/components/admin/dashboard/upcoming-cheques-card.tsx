'use client';

import Link from 'next/link';
import { ArrowUpRight, Banknote, Plus } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
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
        title="Upcoming Cheques"
        description="Supplier cheques queued for bank clearance"
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
        <EmptyState
          icon={Banknote}
          title="No pending cheques due"
          description="Supplier cheques queued for bank deposit will display here automatically."
          action={
            <Button size="sm" asChild>
              <Link href="/admin/credits">
                <Plus />
                Record a Cheque
              </Link>
            </Button>
          }
        />
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
