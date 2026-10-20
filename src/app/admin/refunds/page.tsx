'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { RefundFormDialog } from '@/components/admin/refund-form-dialog';
import { useRefundRowActions } from '@/components/admin/refund-row-actions';
import { useRefunds } from '@/hooks/use-refunds';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Refund, RefundParty } from '@/lib/api/types';

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
  const refundActions = useRefundRowActions();
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

  function statusBadges(refund: Refund) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {refundActions.statusControl(refund)}
        {refundActions.cancelledBadge(refund)}
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
                        {refund.purchase && (
                          <Link
                            href={`/admin/purchases/${refund.purchase.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Order #{refund.purchase.invoiceNumber}
                          </Link>
                        )}
                        {refund.reference && (
                          <p className="text-xs text-muted-foreground">Ref: {refund.reference}</p>
                        )}
                        {cancelNote(refund)}
                      </TableCell>
                      <TableCell>{refundActions.menu(refund)}</TableCell>
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
                    <div className="-mr-2 -mt-1 shrink-0">{refundActions.menu(refund)}</div>
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
                  {refund.purchase && (
                    <Link
                      href={`/admin/purchases/${refund.purchase.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Order #{refund.purchase.invoiceNumber}
                    </Link>
                  )}
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
      {refundActions.dialogs}
    </div>
  );
}
