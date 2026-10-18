'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArchiveRestore,
  History,
  ListChecks,
  Pencil,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { PaymentStatusBadge, ChequeStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { RowActionsMenu, StatusMenuBadge } from '@/components/row-actions';
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
import {
  useDeletedPayments,
  usePayments,
  useReturnPayment,
  useUndoPayment,
  useUpdatePaymentChequeStatus,
} from '@/hooks/use-payments';
import { useResetSalesReturnCounter } from '@/hooks/use-sales-returns';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { ChequeStatus, Invoice, Payment, PaymentChangeAction, PaymentMode, PaymentStatus } from '@/lib/api/types';

const CHEQUE_STATUS_ACTIONS: { status: ChequeStatus; label: string; destructive?: boolean }[] = [
  { status: 'PENDING', label: 'Mark Pending' },
  { status: 'CLEARED', label: 'Mark Cleared' },
  { status: 'RETURNED', label: 'Mark Returned', destructive: true },
];

const UNDO_LABELS: Record<PaymentChangeAction, string> = {
  UPDATED: 'Undo edit',
  CHEQUE_STATUS: 'Undo status',
  DELETED: 'Restore',
};

type InvoiceFilter = { id: string; invoiceNumber: string };

function OutstandingInvoicesTab({ onViewPayments }: { onViewPayments: (invoice: InvoiceFilter) => void }) {
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

  function invoiceActions(invoice: Invoice, compact = true) {
    return (
      <>
        {invoice.paymentStatus !== 'PAID' && Number(invoice.netGrandTotal ?? invoice.grandTotal) > 0 && (
          <Button
            size="sm"
            variant="outline"
            className={compact ? 'h-8' : 'h-9 min-w-0 flex-1'}
            onClick={() => setPayingInvoice(invoice)}
          >
            <Wallet className="size-3.5" />
            Record payment
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className={compact ? 'h-8' : 'h-9 px-2.5'}
          title="Edit, delete or undo this invoice's payments"
          onClick={() => onViewPayments({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })}
        >
          <ListChecks className="size-3.5" />
          Payments
        </Button>
        <RowActionsMenu
          label="More invoice actions"
          groups={[
            [{ label: 'View invoice', icon: Receipt, href: `/admin/invoices/${invoice.id}` }],
            [{ label: 'Return goods', icon: Undo2, onSelect: () => setReturnOrderId(invoice.orderId) }],
          ]}
        />
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader title="Invoices" isFetching={isFetching && !isLoading} className="pb-3" />
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
          <SelectContent searchable searchPlaceholder="Search customers…">
            <SelectItem value="all">All customer</SelectItem>
            {dealers?.data.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="min-w-0 w-full sm:w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="min-w-0 w-full sm:w-auto"
          />
        </div>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={6} />
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
          <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.dealer?.businessName ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(invoice.grandTotal)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">{invoiceActions(invoice)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {data.data.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/invoices/${invoice.id}`}
                      className="break-words font-medium text-primary hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <div className="mt-0.5 break-words text-sm">{invoice.dealer?.businessName ?? '—'}</div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(invoice.grandTotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Due {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
                  <PaymentStatusBadge status={invoice.paymentStatus} />
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border pt-3">
                  {invoiceActions(invoice, false)}
                </div>
              </div>
            ))}
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

function PaymentHistoryTab({
  invoiceFilter,
  onClearInvoiceFilter,
}: {
  invoiceFilter: InvoiceFilter | null;
  onClearInvoiceFilter: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<'all' | ChequeStatus>('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);
  const updateChequeStatus = useUpdatePaymentChequeStatus();
  const deletePaymentMutation = useReturnPayment();
  const undoPayment = useUndoPayment();

  const { data: dealers } = useAllCustomer();
  const filtersActive =
    !!search ||
    mode !== 'all' ||
    chequeStatusFilter !== 'all' ||
    dealerFilter !== 'all' ||
    !!dateFrom ||
    !!dateTo ||
    !!invoiceFilter;

  const { data, isLoading, isFetching, isError, error, refetch } = usePayments({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    mode: mode === 'all' ? undefined : (mode as PaymentMode),
    chequeStatus: chequeStatusFilter === 'all' ? undefined : chequeStatusFilter,
    dealerId: dealerFilter === 'all' ? undefined : dealerFilter,
    invoiceId: invoiceFilter?.id,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    onClearInvoiceFilter();
    setSearch('');
    setMode('all');
    setChequeStatusFilter('all');
    setDealerFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function undo(paymentId: string, doneMessage = 'Change undone') {
    undoPayment.mutate(paymentId, {
      onSuccess: () => toast.success(doneMessage),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  // Every change can be taken back: the toast carries an Undo, and the row
  // keeps an "Undo" button until the change is undone.
  const undoAction = (paymentId: string, doneMessage?: string) => ({
    action: { label: 'Undo', onClick: () => undo(paymentId, doneMessage) },
  });

  function markCheque(paymentId: string, status: ChequeStatus) {
    updateChequeStatus.mutate(
      { id: paymentId, status },
      {
        onSuccess: () => {
          const message =
            status === 'CLEARED'
              ? 'Cheque marked cleared — now counted in Liquid Cash'
              : status === 'RETURNED'
                ? 'Cheque marked returned — dealer balance restored'
                : 'Cheque set back to pending';
          toast.success(message, undoAction(paymentId, 'Cheque status change undone'));
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function confirmDelete() {
    if (!deletePayment) return;
    const id = deletePayment.id;
    deletePaymentMutation.mutate(id, {
      onSuccess: () => toast.success('Payment deleted — dealer balance restored', undoAction(id, 'Payment restored')),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
    setDeletePayment(null);
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

  // Only disable the row actually being mutated — other rows stay
  // interactive while one payment's change is in flight.
  function rowBusy(payment: Payment) {
    return (
      (updateChequeStatus.isPending && updateChequeStatus.variables?.id === payment.id) ||
      (undoPayment.isPending && undoPayment.variables === payment.id)
    );
  }

  /** The cheque badge doubles as the control for changing its status. */
  function chequeStatusControl(payment: Payment) {
    if (!payment.chequeStatus) return <span className="text-muted-foreground">—</span>;
    return (
      <StatusMenuBadge
        label="Change cheque status"
        busy={rowBusy(payment)}
        badge={<ChequeStatusBadge status={payment.chequeStatus} />}
        options={CHEQUE_STATUS_ACTIONS.map((a) => ({
          label: a.label,
          destructive: a.destructive,
          current: a.status === payment.chequeStatus,
          onSelect: () => markCheque(payment.id, a.status),
        }))}
      />
    );
  }

  function rowActions(payment: Payment) {
    const busy = rowBusy(payment);
    return (
      <div className="flex items-center justify-end gap-1">
        {payment.lastChange && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-foreground"
            disabled={busy}
            title={`Undo the last change (${formatDate(payment.lastChange.createdAt)})`}
            onClick={() => undo(payment.id)}
          >
            <History className="size-3.5" />
            {UNDO_LABELS[payment.lastChange.action]}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setEditingPayment(payment)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <RowActionsMenu
          label="More payment actions"
          disabled={busy}
          groups={[
            [
              {
                label: 'View invoice',
                icon: Receipt,
                href: payment.invoice ? `/admin/invoices/${payment.invoice.id}` : undefined,
                hidden: !payment.invoice,
              },
              {
                label: 'Return goods',
                icon: Undo2,
                onSelect: () => payment.invoice && setReturnOrderId(payment.invoice.orderId),
                hidden: !payment.invoice,
              },
            ],
            [{ label: 'Delete payment', icon: Trash2, destructive: true, onSelect: () => setDeletePayment(payment) }],
          ]}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader title="Payment history" isFetching={isFetching && !isLoading} className="pb-3" />
      <FilterBar>
        {invoiceFilter && (
          <Button variant="secondary" size="sm" onClick={onClearInvoiceFilter} title="Show all invoices">
            Invoice {invoiceFilter.invoiceNumber}
            <X className="size-3.5" />
          </Button>
        )}
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
          <SelectContent searchable searchPlaceholder="Search customers…">
            <SelectItem value="all">All customer</SelectItem>
            {dealers?.data.map((dealer) => (
              <SelectItem key={dealer.id} value={dealer.id}>
                {dealer.businessName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="min-w-0 w-full sm:w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="min-w-0 w-full sm:w-auto"
          />
        </div>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={6} />
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
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Cheque Status</TableHead>
                  <TableHead>Cheque Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-normal break-words">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {payment.dealer?.businessName ?? '—'}
                    </TableCell>
                    <TableCell>
                      {payment.invoice ? (
                        <Link href={`/admin/invoices/${payment.invoice.id}`} className="text-primary hover:underline">
                          {payment.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>{chequeStatusControl(payment)}</TableCell>
                    <TableCell className="whitespace-normal">{chequeDetails(payment) ?? '—'}</TableCell>
                    <TableCell className="text-right">{rowActions(payment)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {data.data.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="break-words font-medium">{payment.dealer?.businessName ?? '—'}</span>
                  <span className="shrink-0 break-words font-semibold tabular-nums">
                    {formatCurrency(payment.amount)}
                  </span>
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
                {chequeDetails(payment) && <div className="mt-2">{chequeDetails(payment)}</div>}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  {chequeStatusControl(payment)}
                  {rowActions(payment)}
                </div>
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

      <AlertDialog open={!!deletePayment} onOpenChange={(open) => !open && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deletePayment?.mode.replace('_', ' ').toLowerCase()} payment of{' '}
              {deletePayment ? formatCurrency(deletePayment.amount) : ''} and restores the dealer&apos;s outstanding
              balance and the invoice status. Nothing is lost — you can restore it any time from the Deleted tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePaymentMutation.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete payment
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

function DeletedPaymentsTab() {
  const [page, setPage] = useState(1);
  const undoPayment = useUndoPayment();
  const { data, isLoading, isFetching, isError, error, refetch } = useDeletedPayments({ page, limit: 20 });

  function restore(paymentId: string) {
    undoPayment.mutate(paymentId, {
      onSuccess: () => toast.success('Payment restored — dealer balance and invoice status updated'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title="Deleted payments"
        description="Kept here so they can be restored exactly as they were — dealer balance and invoice status are re-applied."
        isFetching={isFetching && !isLoading}
        className="pb-4"
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={Trash2} title="No deleted payments" />
      ) : (
        <>
          <div className={cn('hidden lg:block', isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Cheque Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.deletedAt)}</TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {payment.dealer?.businessName ?? '—'}
                    </TableCell>
                    <TableCell>{payment.invoice?.invoiceNumber ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {payment.chequeStatus ? <ChequeStatusBadge status={payment.chequeStatus} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={undoPayment.isPending && undoPayment.variables === payment.id}
                        onClick={() => restore(payment.id)}
                      >
                        <ArchiveRestore className="size-3.5" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={cn('space-y-3 p-4 lg:hidden', isFetching && 'opacity-60 transition-opacity')}>
            {data.data.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="break-words font-medium">{payment.dealer?.businessName ?? '—'}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatDate(payment.paymentDate)} &middot; {payment.mode.replace('_', ' ')}
                  {payment.invoice ? <> &middot; {payment.invoice.invoiceNumber}</> : null} &middot; deleted{' '}
                  {formatDate(payment.deletedAt)}
                </div>
                {payment.chequeStatus && (
                  <div className="mt-2">
                    <ChequeStatusBadge status={payment.chequeStatus} />
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={undoPayment.isPending && undoPayment.variables === payment.id}
                  onClick={() => restore(payment.id)}
                >
                  <ArchiveRestore className="size-3.5" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState('outstanding');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter | null>(null);
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
      <PageHeader
        title="Payments & Collections"
        description="Track dues and record payments against invoices — edit, delete or undo them under Payment History."
        actions={
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RotateCcw />
            Reset Return Counter
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="outstanding">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>
        <TabsContent value="outstanding">
          <OutstandingInvoicesTab
            onViewPayments={(invoice) => {
              setInvoiceFilter(invoice);
              setTab('history');
            }}
          />
        </TabsContent>
        <TabsContent value="history">
          <PaymentHistoryTab invoiceFilter={invoiceFilter} onClearInvoiceFilter={() => setInvoiceFilter(null)} />
        </TabsContent>
        <TabsContent value="deleted">
          <DeletedPaymentsTab />
        </TabsContent>
      </Tabs>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the sales-return-number counter?</AlertDialogTitle>
            <AlertDialogDescription>
              Realigns the next return number with what&apos;s actually in the table — one past the highest return
              number still on record, or #00001 if there are no returns left (e.g. after clearing a dealer&apos;s data).
              Existing return numbers are never changed.
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
