'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
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
import { formatCurrency, formatDate } from '@/lib/utils';

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
          <h1 className="text-2xl font-semibold">Purchase from {purchase.supplier.name}</h1>
          <p className="text-sm text-muted-foreground">
            Invoice {purchase.invoiceNumber} &middot; {formatDate(purchase.purchaseDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReturnFormOpen(true)}>
            <Undo2 />
            Record Return
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
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
                    <TableCell>{formatDate(purchaseReturn.returnDate)}</TableCell>
                    <TableCell>{purchaseReturn.reason}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchaseReturn.totalAmount)}</TableCell>
                  </TableRow>
                ))}
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
