'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Coins,
  HandCoins,
  Loader2,
  Plus,
  Search,
  Trash2,
  Truck,
  Undo2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChequeStatusBadge } from '@/components/status-badge';
import { SettlementFormDialog } from '@/components/admin/settlement-form-dialog';
import { StandalonePurchaseReturnFormDialog } from '@/components/admin/standalone-purchase-return-form-dialog';
import {
  useDeleteSettlement,
  useSupplierCreditDetail,
  useSupplierSettlements,
  useUpdateChequeStatus,
} from '@/hooks/use-credits';
import { usePurchases } from '@/hooks/use-purchases';
import { usePurchaseReturns } from '@/hooks/use-purchase-returns';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { getErrorMessage } from '@/lib/api/error';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { ChequeStatus, PaymentMode, SupplierPayment } from '@/lib/api/types';

const CHEQUE_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SETTLEMENT_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;

function canRevertToPending(payment: SupplierPayment) {
  if (payment.mode !== 'CHEQUE') return false;
  if (payment.chequeStatus !== 'CLEARED' && payment.chequeStatus !== 'RETURNED') return false;
  if (!payment.chequeStatusUpdatedAt) return false;
  return Date.now() - new Date(payment.chequeStatusUpdatedAt).getTime() <= CHEQUE_REVERT_WINDOW_MS;
}

function canDeleteSettlement(payment: SupplierPayment) {
  return Date.now() - new Date(payment.createdAt).getTime() <= SETTLEMENT_DELETE_WINDOW_MS;
}

export default function SupplierCreditDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const router = useRouter();
  const { data, isLoading } = useSupplierCreditDetail(supplierId);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [revertPayment, setRevertPayment] = useState<SupplierPayment | null>(null);
  const [deletePayment, setDeletePayment] = useState<SupplierPayment | null>(null);
  const updateChequeStatus = useUpdateChequeStatus();
  const deleteSettlement = useDeleteSettlement();

  // Settlements filters
  const [settlementsPage, setSettlementsPage] = useState(1);
  const [settlementsSearch, setSettlementsSearch] = useState('');
  const debouncedSettlementsSearch = useDebouncedValue(settlementsSearch);
  const [modeFilter, setModeFilter] = useState<'all' | PaymentMode>('all');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<'all' | ChequeStatus>('all');
  const [settlementsDateFrom, setSettlementsDateFrom] = useState('');
  const [settlementsDateTo, setSettlementsDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'paymentDate' | 'chequeDepositDate'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const settlementsFiltersActive =
    !!settlementsSearch || modeFilter !== 'all' || chequeStatusFilter !== 'all' || !!settlementsDateFrom || !!settlementsDateTo; 

  const {
    data: settlements,
    isLoading: settlementsLoading,
    isFetching: settlementsFetching,
  } = useSupplierSettlements(supplierId, {
    page: settlementsPage,
    limit: 10,
    search: debouncedSettlementsSearch || undefined,
    mode: modeFilter === 'all' ? undefined : modeFilter,
    chequeStatus: chequeStatusFilter === 'all' ? undefined : chequeStatusFilter,
    dateFrom: settlementsDateFrom || undefined,
    dateTo: settlementsDateTo || undefined,
    sortBy,
    sortOrder,
  });

  // Purchases filters
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [purchasesSearch, setPurchasesSearch] = useState('');
  const debouncedPurchasesSearch = useDebouncedValue(purchasesSearch);
  const [purchasesDateFrom, setPurchasesDateFrom] = useState('');
  const [purchasesDateTo, setPurchasesDateTo] = useState('');
  const purchasesFiltersActive = !!purchasesSearch || !!purchasesDateFrom || !!purchasesDateTo;

  const {
    data: purchases,
    isLoading: purchasesLoading,
    isFetching: purchasesFetching,
  } = usePurchases({
    supplierId,
    page: purchasesPage,
    limit: 10,
    search: debouncedPurchasesSearch || undefined,
    dateFrom: purchasesDateFrom || undefined,
    dateTo: purchasesDateTo || undefined,
  });

  // Returns filters
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsSearch, setReturnsSearch] = useState('');
  const debouncedReturnsSearch = useDebouncedValue(returnsSearch);
  const [returnsDateFrom, setReturnsDateFrom] = useState('');
  const [returnsDateTo, setReturnsDateTo] = useState('');
  const returnsFiltersActive = !!returnsSearch || !!returnsDateFrom || !!returnsDateTo;

  const {
    data: purchaseReturns,
    isLoading: returnsLoading,
    isFetching: returnsFetching,
  } = usePurchaseReturns({
    supplierId,
    page: returnsPage,
    limit: 10,
    search: debouncedReturnsSearch || undefined,
    dateFrom: returnsDateFrom || undefined,
    dateTo: returnsDateTo || undefined,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full" />;
  }

  function markCheque(paymentId: string, status: ChequeStatus) {
    updateChequeStatus.mutate(
      { paymentId, status },
      {
        onSuccess: () => {
          if (status === 'CLEARED') toast.success('Cheque marked cleared');
          else if (status === 'RETURNED') toast.success('Cheque marked returned — credit restored');
          else toast.success('Cheque reverted to pending');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function confirmRevert() {
    if (!revertPayment) return;
    markCheque(revertPayment.id, 'PENDING');
    setRevertPayment(null);
  }

  function confirmDelete() {
    if (!deletePayment) return;
    deleteSettlement.mutate(deletePayment.id, {
      onSuccess: () => toast.success('Settlement deleted'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
    setDeletePayment(null);
  }

  function clearSettlementsFilters() {
    setSettlementsSearch('');
    setModeFilter('all');
    setChequeStatusFilter('all');
    setSettlementsDateFrom('');
    setSettlementsDateTo('');
    setSettlementsPage(1);
  }

  function clearPurchasesFilters() {
    setPurchasesSearch('');
    setPurchasesDateFrom('');
    setPurchasesDateTo('');
    setPurchasesPage(1);
  }

  function clearReturnsFilters() {
    setReturnsSearch('');
    setReturnsDateFrom('');
    setReturnsDateTo('');
    setReturnsPage(1);
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
        <Button onClick={() => setSettlementOpen(true)} className="shrink-0">
          <Plus />
          Record Settlement
        </Button>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2',
          Number(data.totalTransportCharges) > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
        )}
      >
        <StatCard label="Total Purchases" value={formatCurrency(data.totalPurchases)} icon={Truck} />
        <StatCard label="Returns" value={`−${formatCurrency(data.totalReturns)}`} icon={Undo2} tone="warning" />
        {Number(data.totalTransportCharges) > 0 && (
          <StatCard
            label="Transport Charges"
            value={`−${formatCurrency(data.totalTransportCharges)}`}
            icon={Truck}
            tone="warning"
            hint="Deducted from credit"
          />
        )}
        <StatCard label="Settled" value={`−${formatCurrency(data.totalSettled)}`} icon={Wallet} tone="success" />
        <StatCard
          label="Credit Balance"
          value={formatCurrency(data.creditBalance)}
          icon={Coins}
          hint="Currently owed"
        />
      </div>

      {/* Settlements */}
      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="Settlements" isFetching={settlementsFetching && !settlementsLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[12rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reference..."
              value={settlementsSearch}
              onChange={(e) => {
                setSettlementsSearch(e.target.value);
                setSettlementsPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={modeFilter}
            onValueChange={(v) => {
              setModeFilter(v as 'all' | PaymentMode);
              setSettlementsPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={chequeStatusFilter}
            onValueChange={(v) => {
              setChequeStatusFilter(v as 'all' | ChequeStatus);
              setSettlementsPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All cheque status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cheque status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CLEARED">Cleared</SelectItem>
              <SelectItem value="RETURNED">Returned</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={settlementsDateFrom}
            onChange={(e) => {
              setSettlementsDateFrom(e.target.value);
              setSettlementsPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={settlementsDateTo}
            onChange={(e) => {
              setSettlementsDateTo(e.target.value);
              setSettlementsPage(1);
            }}
            className="w-auto"
          />
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v as 'paymentDate' | 'chequeDepositDate');
              setSettlementsPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paymentDate">Sort by Payment Date</SelectItem>
              <SelectItem value="chequeDepositDate">Sort by Deposit Date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => {
              setSortOrder((v) => (v === 'desc' ? 'asc' : 'desc'));
              setSettlementsPage(1);
            }}
          >
            {sortOrder === 'desc' ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
          </Button>
          {settlementsFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearSettlementsFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {settlementsLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !settlements || settlements.data.length === 0 ? (
          settlementsFiltersActive ? (
            <EmptyState
              icon={Search}
              title="No matching settlements"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearSettlementsFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={HandCoins} title="No settlements yet" description="Record a cash or cheque payment" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', settlementsFetching && 'opacity-60 transition-opacity')}>
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
                  {settlements.data.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-normal break-words">{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                      <TableCell className="whitespace-normal break-words">{payment.reference ?? '—'}</TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.chequeStatus ? <ChequeStatusBadge status={payment.chequeStatus} /> : '—'}
                      </TableCell>
                      <TableCell>{payment.chequeDepositDate ? formatDate(payment.chequeDepositDate) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {payment.mode === 'CHEQUE' && payment.chequeStatus === 'PENDING' && (
                            <>
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
                            </>
                          )}
                          {payment.mode === 'CHEQUE' && canRevertToPending(payment) && (
                            <Button size="sm" variant="outline" onClick={() => setRevertPayment(payment)}>
                              <Undo2 className="size-3.5" />
                              Revert to Pending
                            </Button>
                          )}
                          {canDeleteSettlement(payment) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => setDeletePayment(payment)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', settlementsFetching && 'opacity-60 transition-opacity')}>
              {settlements.data.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium">{payment.mode.replace('_', ' ')}</span>
                    <span className="shrink-0 break-words font-semibold">{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(payment.paymentDate)}</span>
                    <span className="break-words text-right">{payment.reference ?? '—'}</span>
                  </div>
                  {payment.chequeStatus && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ChequeStatusBadge status={payment.chequeStatus} />
                      {payment.chequeDepositDate && (
                        <span className="text-xs text-muted-foreground">{formatDate(payment.chequeDepositDate)}</span>
                      )}
                    </div>
                  )}
                  {payment.mode === 'CHEQUE' && payment.chequeStatus === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => markCheque(payment.id, 'CLEARED')}>
                        Mark Cleared
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive"
                        onClick={() => markCheque(payment.id, 'RETURNED')}
                      >
                        Mark Returned
                      </Button>
                    </div>
                  )}
                  {payment.mode === 'CHEQUE' && canRevertToPending(payment) && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setRevertPayment(payment)}>
                        <Undo2 className="size-3.5" />
                        Revert to Pending
                      </Button>
                    </div>
                  )}
                  {canDeleteSettlement(payment) && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive"
                        onClick={() => setDeletePayment(payment)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <PaginationBar meta={settlements.meta} onPageChange={setSettlementsPage} />
          </>
        )}
      </div>

      {/* Purchases */}
      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="Purchases" isFetching={purchasesFetching && !purchasesLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[12rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice #..."
              value={purchasesSearch}
              onChange={(e) => {
                setPurchasesSearch(e.target.value);
                setPurchasesPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={purchasesDateFrom}
            onChange={(e) => {
              setPurchasesDateFrom(e.target.value);
              setPurchasesPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={purchasesDateTo}
            onChange={(e) => {
              setPurchasesDateTo(e.target.value);
              setPurchasesPage(1);
            }}
            className="w-auto"
          />
          {purchasesFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearPurchasesFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {purchasesLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !purchases || purchases.data.length === 0 ? (
          purchasesFiltersActive ? (
            <EmptyState
              icon={Search}
              title="No matching purchases"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearPurchasesFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Truck} title="No purchases yet" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', purchasesFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Transport</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.data.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="whitespace-normal break-words">{formatDate(purchase.purchaseDate)}</TableCell>
                      <TableCell>
                        <Link href={`/admin/purchases/${purchase.id}`} className="font-medium text-primary hover:underline">
                          {purchase.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        {formatCurrency(purchase.totalValue)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        {Number(purchase.transportCharges) > 0 ? (
                          <span className="text-warning-foreground">−{formatCurrency(purchase.transportCharges)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', purchasesFetching && 'opacity-60 transition-opacity')}>
              {purchases.data.map((purchase) => (
                <Link
                  key={purchase.id}
                  href={`/admin/purchases/${purchase.id}`}
                  className="block rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium text-primary">{purchase.invoiceNumber}</span>
                    <span className="shrink-0 break-words font-semibold">{formatCurrency(purchase.totalValue)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{formatDate(purchase.purchaseDate)}</p>
                    {Number(purchase.transportCharges) > 0 && (
                      <p className="text-xs text-warning-foreground">
                        −{formatCurrency(purchase.transportCharges)} transport
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <PaginationBar meta={purchases.meta} onPageChange={setPurchasesPage} />
          </>
        )}
      </div>

      {/* Returns */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-2 p-4 pb-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Returns</h2>
            {returnsFetching && !returnsLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <Button variant="outline" size="sm" onClick={() => setReturnFormOpen(true)}>
            <Undo2 />
            Record Return
          </Button>
        </div>
        <FilterBar>
          <div className="relative flex-1 sm:max-w-[12rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search return # or reason..."
              value={returnsSearch}
              onChange={(e) => {
                setReturnsSearch(e.target.value);
                setReturnsPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={returnsDateFrom}
            onChange={(e) => {
              setReturnsDateFrom(e.target.value);
              setReturnsPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={returnsDateTo}
            onChange={(e) => {
              setReturnsDateTo(e.target.value);
              setReturnsPage(1);
            }}
            className="w-auto"
          />
          {returnsFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearReturnsFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {returnsLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !purchaseReturns || purchaseReturns.data.length === 0 ? (
          returnsFiltersActive ? (
            <EmptyState
              icon={Search}
              title="No matching returns"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearReturnsFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Undo2} title="No returns yet" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', returnsFetching && 'opacity-60 transition-opacity')}>
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
                  {purchaseReturns.data.map((purchaseReturn) => (
                    <TableRow key={purchaseReturn.id}>
                      <TableCell className="whitespace-normal break-words">{formatDate(purchaseReturn.returnDate)}</TableCell>
                      <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                      <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                      <TableCell className="whitespace-normal break-words text-right">
                        −{formatCurrency(purchaseReturn.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', returnsFetching && 'opacity-60 transition-opacity')}>
              {purchaseReturns.data.map((purchaseReturn) => (
                <div key={purchaseReturn.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium">{purchaseReturn.returnNumber}</span>
                    <span className="shrink-0 break-words font-semibold text-destructive">
                      −{formatCurrency(purchaseReturn.totalAmount)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{purchaseReturn.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(purchaseReturn.returnDate)}</p>
                </div>
              ))}
            </div>

            <PaginationBar meta={purchaseReturns.meta} onPageChange={setReturnsPage} />
          </>
        )}
      </div>

      <StandalonePurchaseReturnFormDialog
        open={returnFormOpen}
        onOpenChange={setReturnFormOpen}
        supplierId={data.supplier.id}
      />

      <SettlementFormDialog
        open={settlementOpen}
        onOpenChange={setSettlementOpen}
        supplierId={data.supplier.id}
        supplierName={data.supplier.name}
        creditBalance={data.creditBalance}
      />

      <AlertDialog open={!!revertPayment} onOpenChange={(open) => !open && setRevertPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert cheque to pending?</AlertDialogTitle>
            <AlertDialogDescription>
              This cheque{revertPayment?.reference ? ` (${revertPayment.reference})` : ''} was marked{' '}
              {revertPayment?.chequeStatus?.toLowerCase()}. Reverting sets it back to pending so it can be marked
              cleared or returned again. Available only within 1 day of the last status change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevert}>Revert to Pending</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePayment} onOpenChange={(open) => !open && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this settlement?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {deletePayment?.mode.replace('_', ' ').toLowerCase()} settlement of{' '}
              {deletePayment ? formatCurrency(deletePayment.amount) : ''}
              {deletePayment?.reference ? ` (${deletePayment.reference})` : ''} and restores the credit balance.
              Only available within 1 day of recording it.
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
