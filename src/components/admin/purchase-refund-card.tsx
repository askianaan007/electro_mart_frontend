'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HandCoins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/loading-state';
import { QueryErrorState } from '@/components/query-error-state';
import { RefundFormDialog } from '@/components/admin/refund-form-dialog';
import { useRefundRowActions } from '@/components/admin/refund-row-actions';
import { useSupplierCreditDetail } from '@/hooks/use-credits';
import { useRefunds } from '@/hooks/use-refunds';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentMode, Purchase, Refund } from '@/lib/api/types';

const MODE_LABEL: Record<PaymentMode, string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' };

function isCounted(refund: Refund) {
  return !refund.cancelledAt && !(refund.mode === 'CHEQUE' && refund.chequeStatus === 'RETURNED');
}

/**
 * Where the money stands on an order the supplier was paid toward — chiefly
 * a cancelled one with an advance. Payments are per supplier, not per order,
 * so the balance shown is the supplier's: when it's negative they owe us,
 * and that's the refund still to come. A refund counts in Liquid Cash only
 * once received (cash / bank) or cleared (cheque).
 */
export function PurchaseRefundCard({ purchase }: { purchase: Purchase }) {
  const [formOpen, setFormOpen] = useState(false);
  const refundActions = useRefundRowActions();
  const credit = useSupplierCreditDetail(purchase.supplierId);
  const refunds = useRefunds({ purchaseId: purchase.id, limit: 50 });

  const balance = credit.data ? Number(credit.data.creditBalance) : null;
  const owedToUs = balance !== null && balance < 0 ? -balance : 0;
  const rows = refunds.data?.data ?? [];
  const counted = rows.filter(isCounted);
  const awaitingClearance = counted
    .filter((r) => r.mode === 'CHEQUE' && r.chequeStatus === 'PENDING')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const received = counted
    .filter((r) => r.mode !== 'CHEQUE' || r.chequeStatus === 'CLEARED')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // Only worth the space when money is, or was, due back on this order.
  if (!purchase.cancelledAt && rows.length === 0 && owedToUs === 0) return null;

  const supplierName = purchase.supplier.name;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3 sm:pb-3">
        <CardTitle>Advance &amp; refund</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)} disabled={owedToUs <= 0}>
          <Plus />
          Record refund received
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {credit.isError ? (
          <QueryErrorState error={credit.error} onRetry={() => credit.refetch()} />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Figure label={`Paid to ${supplierName}`} hint="All orders, settled payments">
              {credit.data ? formatCurrency(credit.data.totalSettled) : '…'}
            </Figure>
            <Figure
              label="Still to come back"
              hint={owedToUs > 0 ? 'Not in Liquid Cash until received' : undefined}
              tone={owedToUs > 0 ? 'warning' : undefined}
            >
              {balance === null ? '…' : formatCurrency(owedToUs)}
            </Figure>
            <Figure label="Cheques awaiting clearance" hint="Counted once marked cleared">
              {formatCurrency(awaitingClearance)}
            </Figure>
            <Figure label="Received" hint="In Liquid Cash" tone={received > 0 ? 'success' : undefined}>
              {formatCurrency(received)}
            </Figure>
          </dl>
        )}
        {balance !== null && balance > 0 && (
          <p className="text-sm text-muted-foreground">
            You still owe {supplierName} {formatCurrency(balance)} across their orders, so nothing is due back.{' '}
            <Link href={`/admin/credits/${purchase.supplierId}`} className="text-primary hover:underline">
              View account
            </Link>
          </p>
        )}

        {refunds.isLoading ? (
          <TableSkeleton rows={1} />
        ) : refunds.isError ? (
          <QueryErrorState error={refunds.error} onRetry={() => refunds.refetch()} />
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            <HandCoins className="size-4 shrink-0" />
            {owedToUs > 0
              ? `Nothing received yet. When ${supplierName} pays back, record it here — a cheque stays out of Liquid Cash until it clears.`
              : 'No refunds recorded for this order.'}
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((refund) => (
                  <TableRow key={refund.id} className={cn(refund.cancelledAt && 'opacity-60')}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{refund.refundNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(refund.refundDate)}</div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {MODE_LABEL[refund.mode]}
                      {refund.mode === 'CHEQUE' && (
                        <div className="text-xs text-muted-foreground">
                          {refund.bankName} {refund.chequeNumber ? `#${refund.chequeNumber}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {refundActions.statusControl(refund) ??
                          (!refund.cancelledAt && <span className="text-sm text-success">Received</span>)}
                        {refundActions.cancelledBadge(refund)}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn('text-right font-medium tabular-nums', refund.cancelledAt && 'line-through')}
                    >
                      +{formatCurrency(refund.amount)}
                    </TableCell>
                    <TableCell>{refundActions.menu(refund)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <RefundFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={{ id: purchase.supplierId, name: supplierName }}
        purchase={purchase}
      />
      {refundActions.dialogs}
    </Card>
  );
}

function Figure({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint?: string;
  tone?: 'warning' | 'success';
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'warning' && 'text-warning-foreground dark:text-warning',
          tone === 'success' && 'text-success',
        )}
      >
        {children}
      </dd>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
