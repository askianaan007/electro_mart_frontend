'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentStatusBadge } from '@/components/status-badge';
import { RecordPaymentDialog } from '@/components/admin/record-payment-dialog';
import { InvoicePrintLayout } from '@/components/admin/invoice-print-layout';
import { useInvoice } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: invoice, isLoading } = useInvoice(id);

  if (isLoading || !invoice) {
    return <Skeleton className="h-96 w-full" />;
  }

  const isFullyPaid = invoice.paymentStatus === 'PAID';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={invoice.paymentStatus} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          {!isFullyPaid && (
            <Button onClick={() => setPaymentOpen(true)}>
              <Wallet />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 print:overflow-visible print:bg-transparent print:p-0 sm:p-8">
        <InvoicePrintLayout invoice={invoice} />
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm font-medium">Payment history</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>{payment.reference ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} invoice={invoice} />
    </div>
  );
}
