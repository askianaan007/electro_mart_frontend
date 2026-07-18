'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Receipt, RotateCcw, Search, Trash2, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PaymentStatusBadge, ChequeStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { SalesReturnFormDialog } from '@/components/admin/sales-return-form-dialog';
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
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments, useReturnPayment, useUpdatePaymentChequeStatus } from '@/hooks/use-payments';
import { useResetSalesReturnCounter } from '@/hooks/use-sales-returns';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { ChequeStatus, Invoice, Payment, PaymentMode, PaymentStatus } from '@/lib/api/types';

const CHEQUE_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAYMENT_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function canRevertToPending(payment: Payment) {
  if (payment.mode !== 'CHEQUE') return false;
  if (payment.chequeStatus !== 'CLEARED' && payment.chequeStatus !== 'RETURNED') return false;
  if (!payment.chequeStatusUpdatedAt) return false;
  return Date.now() - new Date(payment.chequeStatusUpdatedAt).getTime() <= CHEQUE_REVERT_WINDOW_MS;
}

function canEditPayment(payment: Payment) {
  if (Date.now() - new Date(payment.createdAt).getTime() > PAYMENT_EDIT_WINDOW_MS) return false;
  if (payment.mode === 'CHEQUE' && payment.chequeStatus !== 'PENDING') return false;
  return true;
}

function OutstandingInvoicesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);

  const { data: dealers } = useAllCustomer();
  const filtersActive = !!search || status !== 'all' || dealerFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data, isLoading, isFetching, isError, error, refetch } = useInvoices({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    paymentStatus: status === 'all' ? undefined : (status as PaymentStatus),
    dealerId: dealerFilter === 'all' ? undefined : dealerFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setDealerFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <SectionHeader title="Invoices" isFetching={isFetching && !isLoading} />
      <FilterBar>
        <div className="relative flex-1 sm:max-w-[12rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={dealerFilter}
          onValueChange={(v) => {
            setDealerFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customer</SelectItem>
            {dealers?.data.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {isLoading ? (
        <div className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.data.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={Search}
            title="No matching invoices"
            description="Try adjusting or clearing your filters"
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Receipt} title="No invoices found" />
        )
      ) : (
        <>
          <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-primary">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.dealer?.businessName ?? '—'}</TableCell>
                    <TableCell>{formatCurrency(invoice.grandTotal)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {invoice.paymentStatus !== 'PAID' &&
                          Number(invoice.netGrandTotal ?? invoice.grandTotal) > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setPayingInvoice(invoice)}>
                              <Wallet />
                              Record
                            </Button>
                          )}
                        <Button size="sm" variant="outline" onClick={() => setReturnOrderId(invoice.orderId)}>
                          <Undo2 />
                          Return Goods
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}

      <RecordPaymentDialog
        open={!!payingInvoice}
        onOpenChange={(open) => !open && setPayingInvoice(null)}
        invoice={payingInvoice}
      />
      <SalesReturnFormDialog
        open={!!returnOrderId}
        onOpenChange={(open) => !open && setReturnOrderId(null)}
        orderId={returnOrderId}
      />
    </div>
  );
}

function PaymentHistoryTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<'all' | ChequeStatus>('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [revertPayment, setRevertPayment] = useState<Payment | null>(null);
  const [returnPayment, setReturnPayment] = useState<Payment | null>(null);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const updateChequeStatus = useUpdatePaymentChequeStatus();
  const returnPaymentMutation = useReturnPayment();

  const { data: dealers } = useAllCustomer();
  const filtersActive =
    !!search || mode !== 'all' || chequeStatusFilter !== 'all' || dealerFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data, isLoading, isFetching, isError, error, refetch } = usePayments({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    mode: mode === 'all' ? undefined : (mode as PaymentMode),
    chequeStatus: chequeStatusFilter === 'all' ? undefined : chequeStatusFilter,
    dealerId: dealerFilter === 'all' ? undefined : dealerFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setSearch('');
    setMode('all');
    setChequeStatusFilter('all');
    setDealerFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function markCheque(paymentId: string, status: ChequeStatus) {
    updateChequeStatus.mutate(
      { id: paymentId, status },
      {
        onSuccess: () => {
          if (status === 'CLEARED') toast.success('Cheque marked cleared — now counted in Liquid Cash');
          else if (status === 'RETURNED') toast.success('Cheque marked returned — dealer balance restored');
          else toast.success('Cheque reverted to pending');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function confirmRevert() {
    if (!revertPayment) return;
    markCheque(revertPayment.id, 'PENDING');
    setRevertPayment(null);
  }

  function confirmReturn() {
    if (!returnPayment) return;
    returnPaymentMutation.mutate(returnPayment.id, {
      onSuccess: () => toast.success('Payment returned — dealer balance restored'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
    setReturnPayment(null);
  }

  function chequeDetails(payment: Payment) {
    if (payment.mode !== 'CHEQUE') return null;
    return (
      <div className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          {payment.bankName ?? '—'} {payment.chequeNumber ? `#${payment.chequeNumber}` : ''}
        </p>
        <p>
          Cheque {payment.chequeDate ? formatDate(payment.chequeDate) : '—'} &middot; Collected{' '}
          {payment.collectedDate ? formatDate(payment.collectedDate) : '—'}
        </p>
      </div>
    );
  }

  function rowActions(payment: Payment, layout: 'row' | 'stack') {
    const wrapClass = layout === 'row' ? 'flex flex-wrap gap-1' : 'mt-3 flex flex-wrap gap-2';
    // Only disable the row actually being mutated — other rows should stay
    // interactive while one cheque's status change is in flight.
    const thisRowPending = updateChequeStatus.isPending && updateChequeStatus.variables?.id === payment.id;
    return (
      <div className={wrapClass}>
        {payment.mode === 'CHEQUE' && payment.chequeStatus === 'PENDING' && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={thisRowPending}
              onClick={() => markCheque(payment.id, 'CLEARED')}
            >
              Mark Cleared
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={thisRowPending}
              onClick={() => markCheque(payment.id, 'RETURNED')}
            >
              Mark Returned
            </Button>
          </>
        )}
        {payment.mode === 'CHEQUE' && canRevertToPending(payment) && (
          <Button size="sm" variant="outline" onClick={() => setRevertPayment(payment)}>
            <Undo2 className="size-3.5" />
            Revert to Pending
          </Button>
        )}
        {canEditPayment(payment) && (
          <Button size="sm" variant="outline" onClick={() => setEditingPayment(payment)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
        {canEditPayment(payment) && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setReturnPayment(payment)}>
            <Trash2 className="size-3.5" />
            Return
          </Button>
        )}
        {payment.invoice && (
          <Button size="sm" variant="outline" onClick={() => setReturnOrderId(payment.invoice!.orderId)}>
            <Undo2 className="size-3.5" />
            Return Goods
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <SectionHeader title="Payment history" isFetching={isFetching && !isLoading} />
      <FilterBar>
        <div className="relative flex-1 sm:max-w-[12rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference, cheque #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={mode}
          onValueChange={(v) => {
            setMode(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={chequeStatusFilter}
          onValueChange={(v) => {
            setChequeStatusFilter(v as 'all' | ChequeStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Cheque status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cheque status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CLEARED">Cleared</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={dealerFilter}
          onValueChange={(v) => {
            setDealerFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customer</SelectItem>
            {dealers?.data.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-auto"
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {isLoading ? (
        <div className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.data.length === 0 ? (
        filtersActive ? (
          <EmptyState
            icon={Search}
            title="No matching payments"
            description="Try adjusting or clearing your filters"
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Wallet} title="No payments recorded yet" />
        )
      ) : (
        <>
          <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Cheque Status</TableHead>
                  <TableHead>Cheque Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-normal break-words">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="whitespace-normal break-words">{payment.dealer?.businessName ?? '—'}</TableCell>
                    <TableCell>
                      {payment.invoice ? (
                        <Link href={`/admin/invoices/${payment.invoice.id}`} className="text-primary hover:underline">
                          {payment.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {payment.chequeStatus ? <ChequeStatusBadge status={payment.chequeStatus} /> : '—'}
                    </TableCell>
                    <TableCell>{chequeDetails(payment) ?? '—'}</TableCell>
                    <TableCell>{rowActions(payment, 'row')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {data.data.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="break-words font-medium">{payment.dealer?.businessName ?? '—'}</span>
                  <span className="shrink-0 break-words font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDate(payment.paymentDate)} &middot; {payment.mode.replace('_', ' ')}
                  </span>
                  {payment.invoice && (
                    <Link href={`/admin/invoices/${payment.invoice.id}`} className="text-primary hover:underline">
                      {payment.invoice.invoiceNumber}
                    </Link>
                  )}
                </div>
                {payment.chequeStatus && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <ChequeStatusBadge status={payment.chequeStatus} />
                  </div>
                )}
                {chequeDetails(payment) && <div className="mt-2">{chequeDetails(payment)}</div>}
                {rowActions(payment, 'stack')}
              </div>
            ))}
          </div>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}

      <RecordPaymentDialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
        payment={editingPayment}
      />

      <AlertDialog open={!!revertPayment} onOpenChange={(open) => !open && setRevertPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert cheque to pending?</AlertDialogTitle>
            <AlertDialogDescription>
              This cheque{revertPayment?.reference ? ` (${revertPayment.reference})` : ''} was marked{' '}
              {revertPayment?.chequeStatus?.toLowerCase()}. Reverting sets it back to pending so it can be marked
              cleared or returned again. Available only within 1 day of the last status change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert} disabled={updateChequeStatus.isPending}>
              Revert to Pending
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!returnPayment} onOpenChange={(open) => !open && setReturnPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently reverses the {returnPayment?.mode.replace('_', ' ').toLowerCase()} payment of{' '}
              {returnPayment ? formatCurrency(returnPayment.amount) : ''} and restores the dealer&apos;s outstanding
              balance. Only available within 1 day of recording it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReturn}
              disabled={returnPaymentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Return payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SalesReturnFormDialog
        open={!!returnOrderId}
        onOpenChange={(open) => !open && setReturnOrderId(null)}
        orderId={returnOrderId}
      />
    </div>
  );
}

export default function PaymentsPage() {
  const [resetOpen, setResetOpen] = useState(false);
  const resetCounter = useResetSalesReturnCounter();

  function confirmResetCounter() {
    resetCounter.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          `Sales return counter reset — next return will be #${String(result.nextSerial).padStart(5, '0')}`,
        );
        setResetOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setResetOpen(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Payments &amp; Collections</h1>
          <p className="text-sm text-muted-foreground">Track dues and record payments against invoices</p>
        </div>
        <Button variant="outline" onClick={() => setResetOpen(true)}>
          <RotateCcw />
          Reset Return Counter
        </Button>
      </div>

      <Tabs defaultValue="outstanding">
        <TabsList>
          <TabsTrigger value="outstanding">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>
        <TabsContent value="outstanding">
          <OutstandingInvoicesTab />
        </TabsContent>
        <TabsContent value="history">
          <PaymentHistoryTab />
        </TabsContent>
      </Tabs>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the sales-return-number counter?</AlertDialogTitle>
            <AlertDialogDescription>
              Realigns the next return number with what&apos;s actually in the table — one past the highest return
              number still on record, or #00001 if there are no returns left (e.g. after clearing a dealer&apos;s
              data). Existing return numbers are never changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetCounter} disabled={resetCounter.isPending}>
              Reset counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
