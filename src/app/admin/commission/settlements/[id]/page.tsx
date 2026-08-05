'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, CheckCircle2, Receipt, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SettlementStatusBadge, CommissionLineStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaySettlementDialog } from '@/components/admin/pay-settlement-dialog';
import { RejectReasonDialog } from '@/components/admin/reject-reason-dialog';
import {
  useApproveSettlement,
  useRejectSettlement,
  useSettlement,
  useUpdateSettlementChequeStatus,
} from '@/hooks/use-commission';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data: settlement, isLoading, isError, error, refetch } = useSettlement(id);
  const approveSettlement = useApproveSettlement(id);
  const rejectSettlement = useRejectSettlement(id);
  const updateChequeStatus = useUpdateSettlementChequeStatus(id);

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  if (isLoading || !settlement) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
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

  const canApprove = settlement.status === 'PENDING';
  const canReject = settlement.status === 'PENDING' || settlement.status === 'APPROVED';
  const canPay = settlement.status === 'APPROVED';
  const canUpdateCheque = settlement.status === 'PAID' && settlement.mode === 'CHEQUE' && settlement.chequeStatus === 'PENDING';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{settlement.settlementNumber}</h1>
            <SettlementStatusBadge status={settlement.status} />
            {settlement.chequeStatus && <Badge variant="outline">Cheque: {settlement.chequeStatus}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {settlement.representative?.name} &middot; {formatDate(settlement.periodStart)} –{' '}
            {formatDate(settlement.periodEnd)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <Button onClick={handleApprove} loading={approveSettlement.isPending}>
              <CheckCircle2 />
              Approve
            </Button>
          )}
          {canPay && (
            <Button onClick={() => setPayOpen(true)}>
              <Banknote />
              Record payment
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Commission" value={formatCurrency(settlement.totalCommission)} icon={Banknote} />
        <StatCard label="Line Items" value={settlement.lines?.length ?? 0} icon={Receipt} />
        <StatCard
          label="Payment Mode"
          value={settlement.mode ? settlement.mode.replace('_', ' ') : 'Not yet paid'}
          icon={Banknote}
        />
      </div>

      {settlement.status === 'REJECTED' && settlement.rejectedReason && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Rejected: {settlement.rejectedReason}
        </div>
      )}

      <Card>
        <CardContent className="p-0 sm:p-0">
          {!settlement.lines || settlement.lines.length === 0 ? (
            <EmptyState icon={Receipt} title="No commission lines" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlement.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.order?.orderNumber ?? line.orderId}</TableCell>
                    <TableCell>{line.product?.name ?? line.productId}</TableCell>
                    <TableCell>{formatCurrency(line.amount)}</TableCell>
                    <TableCell>
                      <CommissionLineStatusBadge status={line.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaySettlementDialog open={payOpen} onOpenChange={setPayOpen} settlementId={id} />
      <RejectReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this settlement?"
        description="Its commission lines are released back to pending so they can be picked up by a future settlement."
        pending={rejectSettlement.isPending}
        onConfirm={handleReject}
      />
    </div>
  );
}
