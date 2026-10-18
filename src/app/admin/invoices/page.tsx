'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { PaymentStatusBadge } from '@/components/status-badge';
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
import { useInvoices, useResetInvoiceCounter } from '@/hooks/use-invoices';
import { useAllCustomer } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { PaymentStatus } from '@/lib/api/types';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { data: dealers } = useAllCustomer();
  const resetCounter = useResetInvoiceCounter();
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

  function confirmResetCounter() {
    resetCounter.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Invoice counter reset — next invoice will be #${String(result.nextSerial).padStart(5, '0')}`);
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
        title="Invoices"
        description="Sales invoices generated on order approval."
        actions={
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RotateCcw />
            Reset Counter
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="All invoices" isFetching={isFetching && !isLoading} className="pb-3" />
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
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
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
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.dealer?.businessName ?? '—'}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(invoice.grandTotal)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={invoice.paymentStatus} />
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
                    <span>{formatDate(invoice.createdAt)}</span>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </div>
                </div>
              ))}
            </div>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the invoice-number counter?</AlertDialogTitle>
            <AlertDialogDescription>
              Realigns the next invoice number with what&apos;s actually in the table — one past the highest invoice
              number still on record, or #00001 if there are no invoices left (e.g. after clearing a dealer&apos;s
              data). Existing invoice numbers are never changed.
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
