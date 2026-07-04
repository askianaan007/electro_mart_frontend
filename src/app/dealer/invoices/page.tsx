'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Receipt, Wallet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { PaymentStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { useInvoices } from '@/hooks/use-invoices';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DealerInvoicesPage() {
  const [page, setPage] = useState(1);
  const { data: dashboard } = useDealerDashboard();
  const { data, isLoading } = useInvoices({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices &amp; Payments</h1>
        <p className="text-sm text-muted-foreground">Your billing history and outstanding balance</p>
      </div>

      {dashboard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Total Outstanding Balance" value={formatCurrency(dashboard.outstandingBalance)} icon={Wallet} tone="warning" />
          <StatCard label="Credit Limit" value={formatCurrency(dashboard.creditLimit)} icon={CreditCard} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/dealer/invoices/${invoice.id}`} className="font-medium text-primary">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(invoice.grandTotal)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={invoice.paymentStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
