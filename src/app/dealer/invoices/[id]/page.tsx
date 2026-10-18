'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/status-badge';
import { InvoicePrintLayout } from '@/components/invoice-print-layout';
import { QueryErrorState } from '@/components/query-error-state';
import { useInvoice } from '@/hooks/use-invoices';

export default function DealerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="-ml-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft />
      Back
    </Button>
  );

  if (isError) {
    return (
      <div className="space-y-6">
        {backButton}
        <Card>
          <QueryErrorState error={error} onRetry={() => refetch()} title="Couldn't load this invoice" />
        </Card>
      </div>
    );
  }

  if (isLoading || !invoice) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        {backButton}
        <div className="flex items-center gap-2">
          <PaymentStatusBadge status={invoice.paymentStatus} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 print:overflow-visible print:border-0 print:bg-transparent print:p-0 sm:p-8">
        <InvoicePrintLayout invoice={invoice} />
      </div>
    </div>
  );
}
