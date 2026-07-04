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
import { PaymentStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { useInvoices } from '@/hooks/use-invoices';
import { usePayments } from '@/hooks/use-payments';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, PaymentStatus } from '@/lib/api/types';

function OutstandingInvoicesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('PENDING');
  const debouncedSearch = useDebouncedValue(search);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const { data, isLoading } = useInvoices({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    paymentStatus: status === 'all' ? undefined : (status as PaymentStatus),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
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
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices found" />
        ) : (
          <>
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
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

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
  const { data, isLoading } = usePayments({ page, limit: 20 });

  return (
    <div className="rounded-xl border border-border bg-card">
      {isLoading ? (
        <div className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments recorded yet" />
      ) : (
        <>
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
