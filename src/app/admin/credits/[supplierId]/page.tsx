'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, HandCoins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChequeStatusBadge } from '@/components/status-badge';
import { SettlementFormDialog } from '@/components/admin/settlement-form-dialog';
import { useSupplierCreditDetail, useUpdateChequeStatus } from '@/hooks/use-credits';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SupplierCreditDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const router = useRouter();
  const { data, isLoading } = useSupplierCreditDetail(supplierId);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const updateChequeStatus = useUpdateChequeStatus();

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  function markCheque(paymentId: string, status: 'CLEARED' | 'RETURNED') {
    updateChequeStatus.mutate(
      { paymentId, status },
      {
        onSuccess: () =>
          toast.success(status === 'CLEARED' ? 'Cheque marked cleared' : 'Cheque marked returned — credit restored'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">{data.supplier.name}</h1>
          <p className="text-sm text-muted-foreground">Credit (payable) history</p>
        </div>
        <Button onClick={() => setSettlementOpen(true)}>
          <Plus />
          Record Settlement
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Purchases</p>
            <p className="text-lg font-semibold">{formatCurrency(data.totalPurchases)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Returns</p>
            <p className="text-lg font-semibold">−{formatCurrency(data.totalReturns)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Settled</p>
            <p className="text-lg font-semibold">−{formatCurrency(data.totalSettled)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Credit Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(data.creditBalance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {data.payments.length === 0 ? (
            <EmptyState icon={HandCoins} title="No settlements yet" description="Record a cash or cheque payment" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Cheque Status</TableHead>
                  <TableHead>Deposit Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                    <TableCell>{payment.reference ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      {payment.chequeStatus ? <ChequeStatusBadge status={payment.chequeStatus} /> : '—'}
                    </TableCell>
                    <TableCell>
                      {payment.chequeDepositDate ? formatDate(payment.chequeDepositDate) : '—'}
                    </TableCell>
                    <TableCell>
                      {payment.mode === 'CHEQUE' && payment.chequeStatus === 'PENDING' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => markCheque(payment.id, 'CLEARED')}>
                            Mark Cleared
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => markCheque(payment.id, 'RETURNED')}
                          >
                            Mark Returned
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchases</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {data.purchases.length === 0 ? (
            <EmptyState icon={HandCoins} title="No purchases yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell>
                      <Link href={`/admin/purchases/${purchase.id}`} className="font-medium text-primary">
                        {purchase.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(purchase.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.purchaseReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Returns</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Return #</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchaseReturns.map((purchaseReturn) => (
                  <TableRow key={purchaseReturn.id}>
                    <TableCell>{formatDate(purchaseReturn.returnDate)}</TableCell>
                    <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                    <TableCell>{purchaseReturn.reason}</TableCell>
                    <TableCell className="text-right">−{formatCurrency(purchaseReturn.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SettlementFormDialog
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
        supplierId={data.supplier.id}
        supplierName={data.supplier.name}
        creditBalance={data.creditBalance}
      />
    </div>
  );
}
