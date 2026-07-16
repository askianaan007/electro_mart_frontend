'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/status-badge';
import { InvoicePrintLayout } from '@/components/invoice-print-layout';
import { useInvoice } from '@/hooks/use-invoices';

export default function DealerInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(id);

  if (isLoading || !invoice) {
    return <Skeleton className="h-96 w-full" />;
  }

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
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-muted/40 p-4 print:overflow-visible print:bg-transparent print:p-0 sm:p-8">
        <InvoicePrintLayout invoice={invoice} />
      </div>
    </div>
  );
}
