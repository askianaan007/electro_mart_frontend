'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePurchase } from '@/hooks/use-purchases';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: purchase, isLoading } = usePurchase(id);

  if (isLoading || !purchase) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Purchase from {purchase.supplier.name}</h1>
        <p className="text-sm text-muted-foreground">
          Invoice {purchase.invoiceNumber} &middot; {formatDate(purchase.purchaseDate)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product?.name ?? item.productId}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Card className="w-full sm:w-64">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Total Purchase Value</span>
            <span className="text-lg font-semibold">{formatCurrency(purchase.totalValue)}</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
