'use client';

import { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { TableSkeleton } from '@/components/loading-state';
import { SettlementStatusBadge } from '@/components/status-badge';
import {
  useCollectionPerformanceReport,
  useCommissionSummaryReport,
  useOutstandingByRepresentativeReport,
  useOverdueCollectionsReport,
  useRepresentativePerformanceReport,
  useReturnedChequesReport,
  useSalesByCategoryReport,
  useSalesByProductReport,
  useSalesByRepresentativeReport,
  useSettlementSummaryReport,
} from '@/hooks/use-reports';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type ReportColumn<T> = {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'right';
  /** Phone card: show this value top-right, next to the first column. */
  headline?: boolean;
};

type ReportQuery<T> = {
  data: T[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

function ReportTable<T>({
  isLoading,
  isError = false,
  error,
  onRetry,
  rows,
  columns,
}: {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  rows: T[] | undefined;
  columns: ReportColumn<T>[];
}) {
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }
  if (isError) {
    return <QueryErrorState error={error} onRetry={onRetry} />;
  }
  if (!rows || rows.length === 0) {
    return <EmptyState icon={FileBarChart} title="No data for this report" />;
  }
  const [titleCol, ...restCols] = columns;
  const headlineCol = restCols.find((col) => col.headline);
  const detailCols = restCols.filter((col) => col !== headlineCol);
  return (
    <>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.header} className={cn(col.align === 'right' && 'text-right')}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.header} className={cn(col.align === 'right' && 'text-right tabular-nums')}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words font-medium">{titleCol.render(row)}</span>
              {headlineCol && (
                <span className="shrink-0 font-semibold tabular-nums">{headlineCol.render(row)}</span>
              )}
            </div>
            {detailCols.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {detailCols.map((col) => (
                  <div key={col.header} className="contents">
                    <dt className="text-muted-foreground">{col.header}</dt>
                    <dd className="min-w-0 break-words text-right font-medium tabular-nums">{col.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ReportPanel<T>({
  title,
  description,
  query,
  columns,
}: {
  title: string;
  description?: string;
  query: ReportQuery<T>;
  columns: ReportColumn<T>[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title={title}
        description={description}
        isFetching={query.isFetching && !query.isLoading}
        className="border-b border-border pb-3"
      />
      <div className={cn(query.isFetching && !query.isLoading && 'opacity-60 transition-opacity')}>
        <ReportTable
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          rows={query.data}
          columns={columns}
        />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const range = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const repPerformance = useRepresentativePerformanceReport(range);
  const collectionPerformance = useCollectionPerformanceReport(range);
  const outstanding = useOutstandingByRepresentativeReport();
  const commissionSummary = useCommissionSummaryReport(range);
  const settlementSummary = useSettlementSummaryReport(range);
  const overdueCollections = useOverdueCollectionsReport();
  const returnedCheques = useReturnedChequesReport(range);
  const salesByProduct = useSalesByProductReport(range);
  const salesByCategory = useSalesByCategoryReport(range);
  const salesByRepresentative = useSalesByRepresentativeReport(range);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Representative and collection performance reporting" />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="sm:w-44" />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="sm:w-44" />
        </div>
        <p className="max-w-md text-xs text-muted-foreground sm:pb-2">
          Applies to date-scoped reports below. Outstanding-by-Representative and Overdue Collections always show
          current state.
        </p>
      </div>

      <Tabs defaultValue="representative-performance" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="representative-performance">Rep Performance</TabsTrigger>
          <TabsTrigger value="collection-performance">Collection Performance</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding by Rep</TabsTrigger>
          <TabsTrigger value="commission-summary">Commission Summary</TabsTrigger>
          <TabsTrigger value="settlement-summary">Settlement Summary</TabsTrigger>
          <TabsTrigger value="overdue-collections">Overdue Collections</TabsTrigger>
          <TabsTrigger value="returned-cheques">Returned Cheques</TabsTrigger>
          <TabsTrigger value="sales-product">Sales by Product</TabsTrigger>
          <TabsTrigger value="sales-category">Sales by Category</TabsTrigger>
          <TabsTrigger value="sales-representative">Sales by Rep</TabsTrigger>
        </TabsList>

        <TabsContent value="representative-performance">
          <ReportPanel
            title="Rep Performance"
            description="Orders and revenue per representative"
            query={repPerformance}
            columns={[
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Orders', render: (r) => r.orderCount, align: 'right' },
              { header: 'Revenue', render: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>, align: 'right', headline: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="collection-performance">
          <ReportPanel
            title="Collection Performance"
            description="Confirmed, rejected and pending collections per representative"
            query={collectionPerformance}
            columns={[
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Confirmed', render: (r) => r.confirmed, align: 'right' },
              { header: 'Confirmed Amount', render: (r) => formatCurrency(r.confirmedAmount), align: 'right', headline: true },
              { header: 'Rejected', render: (r) => r.rejected, align: 'right' },
              { header: 'Pending', render: (r) => r.pending, align: 'right' },
            ]}
          />
        </TabsContent>

        <TabsContent value="outstanding">
          <ReportPanel
            title="Outstanding by Rep"
            description="Current outstanding customer balances per representative"
            query={outstanding}
            columns={[
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Customers', render: (r) => r.customerCount, align: 'right' },
              { header: 'Outstanding Balance', render: (r) => formatCurrency(r.outstandingBalance), align: 'right', headline: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="commission-summary">
          <ReportPanel
            title="Commission Summary"
            description="Commission by status per representative"
            query={commissionSummary}
            columns={[
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Pending', render: (r) => formatCurrency(r.pending), align: 'right' },
              { header: 'Approved', render: (r) => formatCurrency(r.approved), align: 'right' },
              { header: 'Settled', render: (r) => formatCurrency(r.settled), align: 'right' },
              { header: 'Reversed', render: (r) => formatCurrency(r.reversed), align: 'right' },
            ]}
          />
        </TabsContent>

        <TabsContent value="settlement-summary">
          <ReportPanel
            title="Settlement Summary"
            description="Settlements grouped by status"
            query={settlementSummary}
            columns={[
              { header: 'Status', render: (r) => <SettlementStatusBadge status={r.status} /> },
              { header: 'Count', render: (r) => r.count, align: 'right' },
              { header: 'Total Commission', render: (r) => formatCurrency(r.totalCommission), align: 'right', headline: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="overdue-collections">
          <ReportPanel
            title="Overdue Collections"
            description="Invoices past due with outstanding amounts"
            query={overdueCollections}
            columns={[
              { header: 'Order #', render: (r) => r.orderNumber },
              { header: 'Customer', render: (r) => r.customerName },
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Invoice', render: (r) => r.invoiceNumber },
              { header: 'Outstanding', render: (r) => formatCurrency(r.outstandingAmount), align: 'right', headline: true },
              { header: 'Days Overdue', render: (r) => <span className="font-medium text-destructive">{r.overdueDays}</span>, align: 'right' },
            ]}
          />
        </TabsContent>

        <TabsContent value="returned-cheques">
          <ReportPanel
            title="Returned Cheques"
            description="Cheques marked returned in the selected period"
            query={returnedCheques}
            columns={[
              { header: 'Customer', render: (r) => r.customerName },
              { header: 'Invoice', render: (r) => r.invoiceNumber ?? '—' },
              { header: 'Representative', render: (r) => r.representativeName ?? '—' },
              { header: 'Cheque #', render: (r) => r.chequeNumber ?? '—' },
              { header: 'Bank', render: (r) => r.bankName ?? '—' },
              { header: 'Amount', render: (r) => formatCurrency(r.amount), align: 'right', headline: true },
              { header: 'Returned On', render: (r) => (r.chequeStatusUpdatedAt ? formatDate(r.chequeStatusUpdatedAt) : '—') },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales-product">
          <ReportPanel
            title="Sales by Product"
            description="Quantity sold and revenue per product"
            query={salesByProduct}
            columns={[
              { header: 'Product', render: (r) => r.productName },
              { header: 'Code', render: (r) => r.productCode },
              { header: 'Quantity Sold', render: (r) => r.quantitySold, align: 'right' },
              { header: 'Revenue', render: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>, align: 'right', headline: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales-category">
          <ReportPanel
            title="Sales by Category"
            description="Quantity sold and revenue per category"
            query={salesByCategory}
            columns={[
              { header: 'Category', render: (r) => r.category },
              { header: 'Quantity Sold', render: (r) => r.quantitySold, align: 'right' },
              { header: 'Revenue', render: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>, align: 'right', headline: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="sales-representative">
          <ReportPanel
            title="Sales by Rep"
            description="Orders and revenue per representative"
            query={salesByRepresentative}
            columns={[
              { header: 'Representative', render: (r) => r.representativeName },
              { header: 'Orders', render: (r) => r.orderCount, align: 'right' },
              { header: 'Revenue', render: (r) => <span className="font-medium">{formatCurrency(r.revenue)}</span>, align: 'right', headline: true },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
