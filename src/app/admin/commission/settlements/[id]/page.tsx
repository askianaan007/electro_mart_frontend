'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, Info, Receipt, Undo2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SettlementStatusBadge, CommissionLineStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { PageSkeleton } from '@/components/loading-state';
import { PaySettlementDialog } from '@/components/admin/pay-settlement-dialog';
import { RejectReasonDialog } from '@/components/admin/reject-reason-dialog';
import { ReverseSettlementPaymentDialog } from '@/components/admin/reverse-settlement-payment-dialog';
import {
  useApproveSettlement,
  useRejectSettlement,
  useSettlement,
  useUpdateSettlementChequeStatus,
} from '@/hooks/use-commission';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);

  const { data: settlement, isLoading, isError, error, refetch } = useSettlement(id);
  const approveSettlement = useApproveSettlement(id);
  const rejectSettlement = useRejectSettlement(id);
  const updateChequeStatus = useUpdateSettlementChequeStatus(id);

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settlement" onBack={() => router.back()} />
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !settlement) {
    return <PageSkeleton cards={3} />;
  }

  function handleApprove() {
    approveSettlement.mutate(undefined, {
      onSuccess: () => toast.success('Settlement approved'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleReject(reason: string) {
    rejectSettlement.mutate(reason, {
      onSuccess: () => {
        toast.success('Settlement rejected');
        setRejectOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleChequeStatus(status: 'CLEARED' | 'RETURNED') {
    updateChequeStatus.mutate(status, {
      onSuccess: () => toast.success(`Cheque marked ${status.toLowerCase()}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  // A cheque payout leaves the settlement APPROVED until the cheque clears (then PAID). While
  // it's pending the settlement can't be rejected or paid again — the cheque must be marked
  // returned first. A returned cheque is final; the settlement can then be paid again.
  // Settlement cheques only move forward: PENDING → CLEARED / RETURNED.
  const chequePending = settlement.chequeStatus === 'PENDING';
  const chequeReturned = settlement.status === 'APPROVED' && settlement.chequeStatus === 'RETURNED';
  const canApprove = settlement.status === 'PENDING';
  const canReject = (settlement.status === 'PENDING' || settlement.status === 'APPROVED') && !chequePending;
  const canPay = settlement.status === 'APPROVED' && !chequePending;
  const canUpdateCheque = settlement.status === 'APPROVED' && settlement.mode === 'CHEQUE' && chequePending;
  const canReverse = settlement.status === 'PAID';

  return (
    <div className="space-y-6">
      <PageHeader
        title={settlement.settlementNumber}
        onBack={() => router.back()}
        meta={
          <>
            <SettlementStatusBadge status={settlement.status} />
            {settlement.chequeStatus && (
              <Badge
                variant={
                  settlement.chequeStatus === 'CLEARED'
                    ? 'success'
                    : settlement.chequeStatus === 'RETURNED'
                      ? 'destructive'
                      : 'warning'
                }
              >
                Cheque: {settlement.chequeStatus}
              </Badge>
            )}
          </>
        }
        description={
          <span className="tabular-nums">
            {settlement.representative?.name} &middot; {formatDate(settlement.periodStart)} –{' '}
            {formatDate(settlement.periodEnd)}
          </span>
        }
        actions={
          <>
            {canReject && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setRejectOpen(true)}
              >
                <XCircle />
                Reject
              </Button>
            )}
            {canUpdateCheque && (
              <>
                <Button variant="outline" onClick={() => handleChequeStatus('CLEARED')} loading={updateChequeStatus.isPending}>
                  Mark Cleared
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleChequeStatus('RETURNED')}
                  loading={updateChequeStatus.isPending}
                >
                  Mark Returned
                </Button>
              </>
            )}
            {canApprove && (
              <Button onClick={handleApprove} loading={approveSettlement.isPending}>
                <CheckCircle2 />
                Approve
              </Button>
            )}
            {canPay && (
              <Button onClick={() => setPayOpen(true)}>
                <Banknote />
                {chequeReturned ? 'Pay again' : 'Record payment'}
              </Button>
            )}
            {canReverse && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setReverseOpen(true)}
              >
                <Undo2 />
                Reverse payment
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Commission" value={formatCurrency(settlement.totalCommission)} icon={Banknote} />
        <StatCard label="Line Items" value={settlement.lines?.length ?? 0} icon={Receipt} tone="info" />
        <StatCard
          label="Payment Mode"
          value={settlement.mode ? settlement.mode.replace('_', ' ') : 'Not yet paid'}
          icon={Banknote}
          tone={settlement.mode ? 'success' : 'default'}
          hint={
            settlement.mode === 'CHEQUE' && settlement.chequeNumber
              ? `Cheque ${settlement.chequeNumber}${settlement.bankName ? ` · ${settlement.bankName}` : ''}`
              : settlement.reference
                ? `Ref: ${settlement.reference}`
                : undefined
          }
        />
      </div>

      {settlement.status === 'APPROVED' && chequePending && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning-foreground dark:text-warning"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            A payout cheque is pending. Mark it cleared once the bank honours it — that records the commission
            expense and marks the settlement paid. To reject this settlement or pay it another way, mark the cheque
            returned first.
          </span>
        </div>
      )}

      {chequeReturned && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            The payout cheque{settlement.chequeNumber ? ` ${settlement.chequeNumber}` : ''} was returned. Pay this
            settlement again (cash, bank transfer or a new cheque), or reject it.
          </span>
        </div>
      )}

      {settlement.status === 'REVERSED' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning-foreground dark:text-warning"
        >
          <Undo2 className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">
              Payment reversed{settlement.reversedAt ? ` on ${formatDateTime(settlement.reversedAt)}` : ''}:
            </span>{' '}
            {settlement.reversalReason ?? '—'}. The payout expense was kept and a matching reversal was posted to
            Liquid Cash; the commission lines were released back to pending.
          </span>
        </div>
      )}

      {settlement.status === 'REJECTED' && settlement.rejectedReason && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <XCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">Rejected:</span> {settlement.rejectedReason}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Commission lines"
          description="Order lines batched into this settlement"
          className="pb-3"
        />
        <div className="border-t border-border">
          {!settlement.lines || settlement.lines.length === 0 ? (
            <EmptyState icon={Receipt} title="No commission lines" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlement.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.order?.orderNumber ?? line.orderId}</TableCell>
                    <TableCell>{line.product?.name ?? line.productId}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(line.amount)}</TableCell>
                    <TableCell>
                      <CommissionLineStatusBadge status={line.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="font-semibold">
                    Total commission
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(settlement.totalCommission)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
      </div>

      <PaySettlementDialog open={payOpen} onOpenChange={setPayOpen} settlementId={id} />
      <RejectReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this settlement?"
        description="Its commission lines are released back to pending so they can be picked up by a future settlement."
        pending={rejectSettlement.isPending}
        onConfirm={handleReject}
      />
      {canReverse && (
        <ReverseSettlementPaymentDialog
          open={reverseOpen}
          onOpenChange={setReverseOpen}
          settlementId={id}
          settlementNumber={settlement.settlementNumber}
          amount={settlement.totalCommission}
        />
      )}
    </div>
  );
}
