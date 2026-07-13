'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PaymentStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { useAllDealers } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, PaymentMode, PaymentStatus } from '@/lib/api/types';

function OutstandingInvoicesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('PENDING');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const { data: dealers } = useAllDealers();
  const filtersActive = !!search || status !== 'PENDING' || dealerFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data, isLoading, isFetching } = useInvoices({
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
    setStatus('PENDING');
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
            <SelectValue placeholder="All dealers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dealers</SelectItem>
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
                      {invoice.paymentStatus !== 'PAID' && (
                        <Button size="sm" variant="outline" onClick={() => setPayingInvoice(invoice)}>
                          <Wallet />
                          Record
                        </Button>
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

      <RecordPaymentDialog
        open={!!payingInvoice}
        onOpenChange={(open) => !open && setPayingInvoice(null)}
        invoice={payingInvoice}
      />
    </div>
  );
}

function PaymentHistoryTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');
  const [dealerFilter, setDealerFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const { data: dealers } = useAllDealers();
  const filtersActive = !!search || mode !== 'all' || dealerFilter !== 'all' || !!dateFrom || !!dateTo;

  const { data, isLoading, isFetching } = usePayments({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    mode: mode === 'all' ? undefined : (mode as PaymentMode),
    dealerId: dealerFilter === 'all' ? undefined : dealerFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function clearFilters() {
    setSearch('');
    setMode('all');
    setDealerFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <SectionHeader title="Payment history" isFetching={isFetching && !isLoading} />
      <FilterBar>
        <div className="relative flex-1 sm:max-w-[12rem]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reference..."
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
          value={dealerFilter}
          onValueChange={(v) => {
            setDealerFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All dealers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dealers</SelectItem>
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
          <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Mode</TableHead>
                  <TableHead className="hidden sm:table-cell">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{payment.dealer?.businessName ?? '—'}</TableCell>
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
                    <TableCell className="hidden sm:table-cell">{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{payment.reference ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments &amp; Collections</h1>
        <p className="text-sm text-muted-foreground">Track dues and record payments against invoices</p>
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
    </div>
  );
}
