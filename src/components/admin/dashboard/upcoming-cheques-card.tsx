import Link from 'next/link';
import { Banknote, Plus } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { UpcomingCheque } from '@/lib/api/types';

function chequeDueLabel(daysUntilDue: number): { label: string; variant: BadgeProps['variant'] } {
  if (daysUntilDue < 0) return { label: `Overdue by ${Math.abs(daysUntilDue)}d`, variant: 'destructive' };
  if (daysUntilDue === 0) return { label: 'Due today', variant: 'destructive' };
  if (daysUntilDue === 1) return { label: 'Due tomorrow', variant: 'warning' };
  return { label: `in ${daysUntilDue}d`, variant: 'outline' };
}

function ChequeDueBadge({ cheque }: { cheque: UpcomingCheque }) {
  const { label, variant } = chequeDueLabel(cheque.daysUntilDue);
  return <Badge variant={variant}>{label}</Badge>;
}

function EmptyCheques() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-14 text-center">
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-purple/10" />
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-border" />
        <Banknote className="relative size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No cheques due</p>
        <p className="text-sm text-muted-foreground">Pending supplier cheques due for bank deposit will appear here</p>
      </div>
      <Button size="sm" asChild>
        <Link href="/admin/credits">
          <Plus />
          Record a cheque
        </Link>
      </Button>
    </div>
  );
}

export function UpcomingChequesCard({ cheques }: { cheques: UpcomingCheque[] }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br via-card to-card shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between p-5 pb-0 sm:p-6 sm:pb-0">
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">Upcoming Cheques</p>
          <p className="text-xs text-muted-foreground">Supplier cheques queued for bank clearance</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="rounded-lg text-xs font-semibold">
          <Link href="/admin/credits">View all</Link>
        </Button>
      </div>

      {cheques.length === 0 ? (
        <EmptyCheques />
      ) : (
        <>
          <div className="hidden p-4 sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Supplier</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Reference</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Deposit Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cheques.map((cheque) => (
                  <TableRow key={cheque.id} className="hover:bg-muted/40 transition-colors border-border/40">
                    <TableCell className="whitespace-normal wrap-break-word">
                      <Link href={`/admin/credits/${cheque.supplierId}`} className="font-semibold text-primary hover:underline">
                        {cheque.supplierName}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word font-mono text-xs text-muted-foreground">{cheque.reference ?? '—'}</TableCell>
                    <TableCell className="text-right font-bold text-foreground">{formatCurrency(cheque.amount)}</TableCell>
                    <TableCell className="whitespace-normal wrap-break-word text-xs text-muted-foreground font-medium">
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

          <div className="space-y-3 p-4 sm:hidden">
            {cheques.map((cheque) => (
              <Link
                key={cheque.id}
                href={`/admin/credits/${cheque.supplierId}`}
                className="block rounded-xl border border-border/80 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="wrap-break-word font-bold text-primary">{cheque.supplierName}</span>
                  <ChequeDueBadge cheque={cheque} />
                </div>
                <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
                  {cheque.reference ?? '—'} &middot; {formatDate(cheque.chequeDepositDate)}
                </p>
                <p className="mt-2 wrap-break-word text-sm font-bold text-foreground">{formatCurrency(cheque.amount)}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

