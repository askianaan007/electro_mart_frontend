'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Coins, Pencil, Trash2, Truck, Undo2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { StatCard } from '@/components/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PurchaseReturnFormDialog } from '@/components/admin/purchase-return-form-dialog';
import { useDeletePurchase, usePurchase } from '@/hooks/use-purchases';
import { usePurchaseReturnsForPurchase } from '@/hooks/use-purchase-returns';
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: purchase, isLoading } = usePurchase(id);
  const { data: purchaseReturns, isLoading: returnsLoading } = usePurchaseReturnsForPurchase(id);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deletePurchase = useDeletePurchase();

  if (isLoading || !purchase) {
    return <Skeleton className="h-96 w-full" />;
  }

  const grossValue = Number(purchase.totalValue);
  const returnedValue = (purchaseReturns ?? []).reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const transportCharges = Number(purchase.transportCharges);
  const netValue = grossValue - returnedValue - transportCharges;
  const hasReturns = returnedValue > 0;
  const hasTransportCharges = transportCharges > 0;

  function confirmDelete() {
    deletePurchase.mutate(id, {
      onSuccess: () => {
        toast.success('Purchase deleted — stock reversed');
        router.push('/admin/purchases');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Purchase from {purchase.supplier.name}</h1>
            {hasReturns && (
              <Badge variant={netValue <= 0 ? 'destructive' : 'warning'}>
                {netValue <= 0 ? 'Fully Returned' : 'Partially Returned'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Invoice {purchase.invoiceNumber} &middot; {formatDate(purchase.purchaseDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
            <Undo2 />
            Record Return
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/purchases/${id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', hasTransportCharges ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <StatCard label="Gross Purchase Value" value={formatCurrency(grossValue)} icon={Wallet} />
        <StatCard
          label="Returned"
          value={`−${formatCurrency(returnedValue)}`}
          icon={Undo2}
          tone={hasReturns ? 'warning' : 'default'}
        />
        {hasTransportCharges && (
          <StatCard
            label="Transport Charges"
            value={`−${formatCurrency(transportCharges)}`}
            icon={Truck}
            tone="warning"
            hint="Deducted from supplier credit"
          />
        )}
        <StatCard label="Net Value" value={formatCurrency(netValue)} icon={Coins} tone="success" />
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
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal break-words">
                    {item.product?.name ?? item.productId}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Returns</CardTitle>
          {purchaseReturns && purchaseReturns.length > 0 && (
            <Badge variant="warning">
              {purchaseReturns.length} return{purchaseReturns.length === 1 ? '' : 's'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {returnsLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !purchaseReturns || purchaseReturns.length === 0 ? (
            <EmptyState icon={Undo2} title="No returns yet" description="Returns sent back to the supplier will appear here" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseReturns.map((purchaseReturn) => (
                  <TableRow key={purchaseReturn.id}>
                    <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                    <TableCell className="whitespace-normal break-words">{formatDate(purchaseReturn.returnDate)}</TableCell>
                    <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      −{formatCurrency(purchaseReturn.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={3} className="font-semibold">
                    Total returned
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    −{formatCurrency(returnedValue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PurchaseReturnFormDialog open={returnFormOpen} onOpenChange={setReturnFormOpen} purchase={purchase} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the stock it added (and any returns recorded against it). If that stock has already
              been sold, deletion will fail rather than go negative.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
