'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentStatusBadge } from '@/components/status-badge';
import { useInvoice } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

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
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Electro Mart</p>
                <p className="text-xs text-muted-foreground">ERP &amp; Dealer Ordering System</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">Date: {formatDate(invoice.createdAt)}</p>
              {invoice.dueDate && <p className="text-sm text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>}
              <div className="mt-1">
                <PaymentStatusBadge status={invoice.paymentStatus} />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.order?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="w-full space-y-2 sm:w-72">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>{formatCurrency(invoice.discountTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
