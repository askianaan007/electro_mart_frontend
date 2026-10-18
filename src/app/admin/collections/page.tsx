'use client';

import { useState } from 'react';
import { CheckCircle2, HandCoins, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { CollectionStatusBadge } from '@/components/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RejectReasonDialog } from '@/components/admin/reject-reason-dialog';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { useCollections, useConfirmCollection, useRejectCollection } from '@/hooks/use-collections';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { CollectionStatus, CollectionSubmission } from '@/lib/api/types';

function ConfirmCollectionDialog({
  submission,
  onOpenChange,
}: {
  submission: CollectionSubmission | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [invoiceId, setInvoiceId] = useState('');
  const confirmCollection = useConfirmCollection();

  function handleConfirm() {
    if (!submission) return;
    confirmCollection.mutate(
      { id: submission.id, invoiceId: submission.invoiceId ?? (invoiceId || undefined) },
      {
        onSuccess: () => {
          toast.success('Collection confirmed — payment recorded');
          setInvoiceId('');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent title="Confirm collection">
        <DialogHeader>
          <DialogTitle>Confirm collection of {submission ? formatCurrency(submission.amount) : ''}</DialogTitle>
          <DialogDescription>
            This creates a real payment against the customer&apos;s invoice through the exact same guarded pipeline
            every other payment in the system uses.
          </DialogDescription>
        </DialogHeader>
        {submission && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{submission.customer?.businessName ?? submission.customerId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Representative</p>
                <p className="font-medium">{submission.representative?.name ?? submission.representativeId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mode</p>
                <p className="font-medium">{submission.mode.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collection date</p>
                <p className="font-medium tabular-nums">{formatDate(submission.collectionDate)}</p>
              </div>
              {submission.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="font-medium">{submission.notes}</p>
                </div>
              )}
            </div>
            {submission.invoice ? (
              <div className="rounded-lg border border-info/20 bg-info/10 p-3 text-sm text-foreground">
                Applying against invoice <span className="font-semibold">{submission.invoice.invoiceNumber}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="collection-invoice-id">Invoice ID</Label>
                <Input
                  id="collection-invoice-id"
                  placeholder="This collection was not submitted against a specific invoice"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!submission?.invoice && !invoiceId}
            loading={confirmCollection.isPending}
          >
            Confirm &amp; record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CollectionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('PENDING_VERIFICATION');
  const [confirmingSubmission, setConfirmingSubmission] = useState<CollectionSubmission | null>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<CollectionSubmission | null>(null);

  const rejectCollection = useRejectCollection();

  const { data, isLoading, isFetching, isError, error, refetch } = useCollections({
    page,
    limit: 20,
    status: status === 'all' ? undefined : (status as CollectionStatus),
  });

  function handleReject(reason: string) {
    if (!rejectingSubmission) return;
    rejectCollection.mutate(
      { id: rejectingSubmission.id, reason },
      {
        onSuccess: () => {
          toast.success('Collection rejected');
          setRejectingSubmission(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Review payments representatives collected in the field before they post to accounting."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Collection queue" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          data && status === 'PENDING_VERIFICATION' ? (
            <EmptyState icon={HandCoins} title="Nothing pending review" description="All caught up" />
          ) : (
            <EmptyState icon={Search} title="No collections found" />
          )
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Representative</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.customer?.businessName ?? submission.customerId}</TableCell>
                      <TableCell>{submission.representative?.name ?? submission.representativeId}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(submission.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{submission.mode.replace('_', ' ')}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(submission.collectionDate)}
                      </TableCell>
                      <TableCell>
                        <CollectionStatusBadge status={submission.status} />
                      </TableCell>
                      <TableCell>
                        {submission.status === 'PENDING_VERIFICATION' && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => setConfirmingSubmission(submission)}>
                              <CheckCircle2 className="text-success" />
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRejectingSubmission(submission)}
                            >
                              <XCircle />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmCollectionDialog submission={confirmingSubmission} onOpenChange={(open) => !open && setConfirmingSubmission(null)} />
      <RejectReasonDialog
        open={!!rejectingSubmission}
        onOpenChange={(open) => !open && setRejectingSubmission(null)}
        title="Reject this collection?"
        description="No payment is recorded and nothing changes in accounting. The representative is notified with the reason."
        pending={rejectCollection.isPending}
        onConfirm={handleReject}
      />
    </div>
  );
}
