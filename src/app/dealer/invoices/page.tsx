'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Receipt, Wallet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { TableSkeleton } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { PaymentStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { useInvoices } from '@/hooks/use-invoices';
import { useDealerDashboard } from '@/hooks/use-dashboard';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function DealerInvoicesPage() {
  const [page, setPage] = useState(1);
  const { data: dashboard } = useDealerDashboard();
  const { data, isLoading, isFetching, isError, error, refetch } = useInvoices({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices & Payments" description="Your billing history and outstanding balance." />

      {dashboard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Total Outstanding Balance"
            value={formatCurrency(dashboard.outstandingBalance)}
            icon={Wallet}
            tone="warning"
          />
          <StatCard
            label="Credit Limit"
            value={dashboard.unlimitedCredit ? 'Unlimited' : formatCurrency(dashboard.creditLimit)}
            icon={CreditCard}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Invoices" isFetching={isFetching && !isLoading} className="pb-3" />
        <div className="border-t border-border">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : isError ? (
            <QueryErrorState error={error} onRetry={() => refetch()} />
          ) : !data || data.data.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoices appear here once your orders are billed."
            />
          ) : (
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/dealer/invoices/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground sm:hidden">{formatDate(invoice.createdAt)}</div>
                      </TableCell>
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
              <PaginationBar meta={data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
