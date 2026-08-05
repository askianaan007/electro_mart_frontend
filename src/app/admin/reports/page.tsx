'use client';

import { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
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
import { formatCurrency, formatDate } from '@/lib/utils';

function ReportTable<T>({
  isLoading,
  rows,
  columns,
}: {
  isLoading: boolean;
  rows: T[] | undefined;
  columns: { header: string; render: (row: T) => React.ReactNode }[];
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return <EmptyState icon={FileBarChart} title="No data for this report" />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.header}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell key={col.header}>{col.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Representative and collection performance reporting</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          Applies to date-scoped reports below. Outstanding-by-Representative and Overdue Collections always show
          current state.
        </p>
      </div>

      <Tabs defaultValue="representative-performance">
        <TabsList className="flex-wrap">
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
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={repPerformance.isLoading}
                rows={repPerformance.data}
                columns={[
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Orders', render: (r) => r.orderCount },
                  { header: 'Revenue', render: (r) => formatCurrency(r.revenue) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection-performance">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={collectionPerformance.isLoading}
                rows={collectionPerformance.data}
                columns={[
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Confirmed', render: (r) => r.confirmed },
                  { header: 'Confirmed Amount', render: (r) => formatCurrency(r.confirmedAmount) },
                  { header: 'Rejected', render: (r) => r.rejected },
                  { header: 'Pending', render: (r) => r.pending },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={outstanding.isLoading}
                rows={outstanding.data}
                columns={[
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Customers', render: (r) => r.customerCount },
                  { header: 'Outstanding Balance', render: (r) => formatCurrency(r.outstandingBalance) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission-summary">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={commissionSummary.isLoading}
                rows={commissionSummary.data}
                columns={[
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Pending', render: (r) => formatCurrency(r.pending) },
                  { header: 'Approved', render: (r) => formatCurrency(r.approved) },
                  { header: 'Settled', render: (r) => formatCurrency(r.settled) },
                  { header: 'Reversed', render: (r) => formatCurrency(r.reversed) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement-summary">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={settlementSummary.isLoading}
                rows={settlementSummary.data}
                columns={[
                  { header: 'Status', render: (r) => r.status },
                  { header: 'Count', render: (r) => r.count },
                  { header: 'Total Commission', render: (r) => formatCurrency(r.totalCommission) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue-collections">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={overdueCollections.isLoading}
                rows={overdueCollections.data}
                columns={[
                  { header: 'Order #', render: (r) => r.orderNumber },
                  { header: 'Customer', render: (r) => r.customerName },
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Invoice', render: (r) => r.invoiceNumber },
                  { header: 'Outstanding', render: (r) => formatCurrency(r.outstandingAmount) },
                  { header: 'Days Overdue', render: (r) => r.overdueDays },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returned-cheques">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={returnedCheques.isLoading}
                rows={returnedCheques.data}
                columns={[
                  { header: 'Customer', render: (r) => r.customerName },
                  { header: 'Invoice', render: (r) => r.invoiceNumber ?? '—' },
                  { header: 'Representative', render: (r) => r.representativeName ?? '—' },
                  { header: 'Cheque #', render: (r) => r.chequeNumber ?? '—' },
                  { header: 'Bank', render: (r) => r.bankName ?? '—' },
                  { header: 'Amount', render: (r) => formatCurrency(r.amount) },
                  { header: 'Returned On', render: (r) => (r.chequeStatusUpdatedAt ? formatDate(r.chequeStatusUpdatedAt) : '—') },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-product">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={salesByProduct.isLoading}
                rows={salesByProduct.data}
                columns={[
                  { header: 'Product', render: (r) => r.productName },
                  { header: 'Code', render: (r) => r.productCode },
                  { header: 'Quantity Sold', render: (r) => r.quantitySold },
                  { header: 'Revenue', render: (r) => formatCurrency(r.revenue) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-category">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={salesByCategory.isLoading}
                rows={salesByCategory.data}
                columns={[
                  { header: 'Category', render: (r) => r.category },
                  { header: 'Quantity Sold', render: (r) => r.quantitySold },
                  { header: 'Revenue', render: (r) => formatCurrency(r.revenue) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-representative">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <ReportTable
                isLoading={salesByRepresentative.isLoading}
                rows={salesByRepresentative.data}
                columns={[
                  { header: 'Representative', render: (r) => r.representativeName },
                  { header: 'Orders', render: (r) => r.orderCount },
                  { header: 'Revenue', render: (r) => formatCurrency(r.revenue) },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
