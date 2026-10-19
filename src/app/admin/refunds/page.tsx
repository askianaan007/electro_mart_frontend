'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Ban, CircleCheck, CircleX, Plus, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { RowActionsMenu } from '@/components/row-actions';
import { ChequeStatusBadge } from '@/components/status-badge';
import { RefundFormDialog } from '@/components/admin/refund-form-dialog';
import { RefundCancelDialog } from '@/components/admin/refund-cancel-dialog';
import { useRefunds, useUpdateRefundChequeStatus } from '@/hooks/use-refunds';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Refund, RefundParty } from '@/lib/api/types';

type ChequeOutcome = 'CLEARED' | 'RETURNED';

function partyName(refund: Refund) {
  return (refund.party === 'DEALER' ? refund.dealer?.businessName : refund.supplier?.name) ?? '—';
}

/** Dealer refunds pay money out; supplier refunds bring money in. */
function Direction({ refund }: { refund: Refund }) {
  return refund.party === 'DEALER' ? (
    <span className="inline-flex items-center gap-1 text-destructive">
      <ArrowUpRight className="size-3.5" />
      Paid out
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-success">
      <ArrowDownLeft className="size-3.5" />
      Received
    </span>
  );
}

export default function RefundsPage() {
  const [page, setPage] = useState(1);
  const [party, setParty] = useState<'all' | RefundParty>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Refund | null>(null);
  const [chequeChange, setChequeChange] = useState<{ refund: Refund; status: ChequeOutcome } | null>(null);

  const updateChequeStatus = useUpdateRefundChequeStatus();
  const filtersActive = party !== 'all';

  const { data, isLoading, isFetching, isError, error, refetch } = useRefunds({
    page,
    limit: 20,
    party: party === 'all' ? undefined : party,
  });

  function clearFilters() {
    setParty('all');
    setPage(1);
  }

  function confirmChequeChange() {
    if (!chequeChange) return;
    const { refund, status } = chequeChange;
    updateChequeStatus.mutate(
      { id: refund.id, status },
      {
        onSuccess: () =>
          toast.success(
            status === 'CLEARED'
              ? 'Cheque marked cleared — now counted in Liquid Cash'
              : 'Cheque marked returned — credit restored',
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
    setChequeChange(null);
  }

  function rowBusy(refund: Refund) {
    return updateChequeStatus.isPending && updateChequeStatus.variables?.id === refund.id;
  }

  function statusBadges(refund: Refund) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {refund.mode === 'CHEQUE' && refund.chequeStatus && <ChequeStatusBadge status={refund.chequeStatus} />}
        {refund.cancelledAt && (
          <Badge variant="muted" title={refund.cancelReason ?? undefined}>
            <Ban className="size-3" />
            Cancelled
          </Badge>
        )}
      </div>
    );
  }

  function chequeDetails(refund: Refund) {
    if (refund.mode !== 'CHEQUE') return null;
    return (
      <p className="text-xs text-muted-foreground">
        {refund.bankName ?? '—'} {refund.chequeNumber ? `#${refund.chequeNumber}` : ''}
        {refund.chequeDate ? ` · ${formatDate(refund.chequeDate)}` : ''}
      </p>
    );
  }

  function cancelNote(refund: Refund) {
    if (!refund.cancelledAt) return null;
    return (
      <p className="text-xs text-muted-foreground">
        Cancelled {formatDate(refund.cancelledAt)}
        {refund.cancelReason ? ` — ${refund.cancelReason}` : ''}
      </p>
    );
  }

  function rowActions(refund: Refund) {
    const cancelled = !!refund.cancelledAt;
    const pendingCheque = refund.mode === 'CHEQUE' && refund.chequeStatus === 'PENDING';
    const clearedCheque = refund.mode === 'CHEQUE' && refund.chequeStatus === 'CLEARED';
    return (
      <RowActionsMenu
        label="Refund actions"
        disabled={rowBusy(refund)}
        groups={[
          [
            {
              label: 'Mark cleared',
              icon: CircleCheck,
              hidden: cancelled || !pendingCheque,
              onSelect: () => setChequeChange({ refund, status: 'CLEARED' }),
            },
            {
              label: 'Mark returned',
              icon: CircleX,
              hidden: cancelled || !pendingCheque,
              onSelect: () => setChequeChange({ refund, status: 'RETURNED' }),
            },
          ],
          [
            {
              label: 'Cancel refund',
              icon: RotateCcw,
              destructive: true,
              hidden: cancelled || clearedCheque,
              onSelect: () => setCancelling(refund),
            },
          ],
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refunds"
        description="Pay back customers who hold a credit, or record suppliers paying back a credit they owe you."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Record refund
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="All refunds" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <Select
            value={party}
            onValueChange={(v) => {
              setParty(v as 'all' | RefundParty);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Customers &amp; suppliers</SelectItem>
              <SelectItem value="DEALER">Customers (paid out)</SelectItem>
              <SelectItem value="SUPPLIER">Suppliers (received)</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching refunds"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={RotateCcw}
              title="No refunds recorded"
              description="Refunds settle a credit left over after a return on an already-paid invoice or purchase"
            />
          )
        ) : (
          <>
            <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Refund</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((refund) => (
                    <TableRow key={refund.id} className={cn(refund.cancelledAt && 'text-muted-foreground')}>
                      <TableCell className="font-medium">{refund.refundNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(refund.refundDate)}</TableCell>
                      <TableCell className="whitespace-normal break-words">
                        <p className="text-xs text-muted-foreground">
                          {refund.party === 'DEALER' ? 'Customer' : 'Supplier'}
                        </p>
                        <p className="font-medium">{partyName(refund)}</p>
                      </TableCell>
                      <TableCell>
                        <Direction refund={refund} />
                      </TableCell>
                      <TableCell
                        className={cn('text-right font-medium tabular-nums', refund.cancelledAt && 'line-through')}
                      >
                        {formatCurrency(refund.amount)}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p>{refund.mode.replace('_', ' ')}</p>
                        {chequeDetails(refund)}
                      </TableCell>
                      <TableCell>{statusBadges(refund)}</TableCell>
                      <TableCell className="whitespace-normal break-words">
                        <p>{refund.reason}</p>
                        {refund.reference && (
                          <p className="text-xs text-muted-foreground">Ref: {refund.reference}</p>
                        )}
                        {cancelNote(refund)}
                      </TableCell>
                      <TableCell>{rowActions(refund)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((refund) => (
                <div key={refund.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{partyName(refund)}</p>
                      <p className="text-xs text-muted-foreground">
                        {refund.refundNumber} &middot; {refund.party === 'DEALER' ? 'Customer' : 'Supplier'}
                      </p>
                    </div>
                    <div className="-mr-2 -mt-1 shrink-0">{rowActions(refund)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'break-words text-lg font-semibold tabular-nums',
                        refund.cancelledAt && 'text-muted-foreground line-through',
                      )}
                    >
                      {formatCurrency(refund.amount)}
                    </span>
                    <span className="text-sm">
                      <Direction refund={refund} />
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatDate(refund.refundDate)} &middot; {refund.mode.replace('_', ' ')}
                    </span>
                    {statusBadges(refund)}
                  </div>
                  {chequeDetails(refund) && <div className="mt-1">{chequeDetails(refund)}</div>}
                  <p className="mt-2 break-words text-sm">{refund.reason}</p>
                  {refund.reference && <p className="text-xs text-muted-foreground">Ref: {refund.reference}</p>}
                  {cancelNote(refund)}
                </div>
              ))}
            </div>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <RefundFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <RefundCancelDialog refund={cancelling} onClose={() => setCancelling(null)} />

      <AlertDialog open={!!chequeChange} onOpenChange={(open) => !open && setChequeChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark cheque {chequeChange?.status === 'CLEARED' ? 'cleared' : 'returned'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {chequeChange?.status === 'CLEARED'
                ? `The ${chequeChange ? formatCurrency(chequeChange.refund.amount) : ''} cheque will be counted in Liquid Cash.`
                : `The cheque bounced: nothing moves in Liquid Cash and ${chequeChange ? partyName(chequeChange.refund) : ''}'s credit is restored.`}{' '}
              This is final and can&apos;t be changed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChequeChange}
              className={chequeChange?.status === 'RETURNED' ? buttonVariants({ variant: 'destructive' }) : undefined}
            >
              {chequeChange?.status === 'CLEARED' ? 'Mark cleared' : 'Mark returned'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
