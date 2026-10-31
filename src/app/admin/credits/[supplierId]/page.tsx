'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Coins,
  HandCoins,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  Truck,
  Undo2,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { StatCard } from '@/components/stat-card';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton, TableSkeleton } from '@/components/loading-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChequeStatusBadge } from '@/components/status-badge';
import { RowActionsMenu, StatusMenuBadge } from '@/components/row-actions';
import { SettlementFormDialog } from '@/components/admin/settlement-form-dialog';
import { RefundFormDialog } from '@/components/admin/refund-form-dialog';
import { useRefundRowActions } from '@/components/admin/refund-row-actions';
import {
  useDeleteSettlement,
  useSupplierCreditDetail,
  useSupplierSettlements,
  useUpdateChequeStatus,
} from '@/hooks/use-credits';
import { usePurchases } from '@/hooks/use-purchases';
import { usePurchaseReturns } from '@/hooks/use-purchase-returns';
import { useRefunds } from '@/hooks/use-refunds';
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
import type { ChequeStatus, PaymentMode, PurchaseReturn, SupplierPayment } from '@/lib/api/types';

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

/** Which order a return was against — or a nudge that it isn't tied to one. */
function returnOrder(purchaseReturn: PurchaseReturn) {
  if (!purchaseReturn.purchase) return <span className="text-muted-foreground">Not linked</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Link href={`/admin/purchases/${purchaseReturn.purchase.id}`} className="text-primary hover:underline">
        #{purchaseReturn.purchase.invoiceNumber}
      </Link>
      {purchaseReturn.isCancellation && <Badge variant="muted">Cancellation</Badge>}
    </span>
  );
}

export default function SupplierCreditDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSupplierCreditDetail(supplierId);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [refundFormOpen, setRefundFormOpen] = useState(false);
  const [refundsPage, setRefundsPage] = useState(1);
  const refundActions = useRefundRowActions();
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
    !!settlementsSearch ||
    modeFilter !== 'all' ||
    chequeStatusFilter !== 'all' ||
    !!settlementsDateFrom ||
    !!settlementsDateTo;

  const {
    data: settlements,
    isLoading: settlementsLoading,
    isFetching: settlementsFetching,
    isError: settlementsIsError,
    error: settlementsError,
    refetch: refetchSettlements,
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

  // Purchases filtersk
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
    isError: purchasesIsError,
    error: purchasesError,
    refetch: refetchPurchases,
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
    isError: returnsIsError,
    error: returnsError,
    refetch: refetchReturns,
  } = usePurchaseReturns({
    supplierId,
    page: returnsPage,
    limit: 10,
    search: debouncedReturnsSearch || undefined,
    dateFrom: returnsDateFrom || undefined,
    dateTo: returnsDateTo || undefined,
  });

  const {
    data: refunds,
    isLoading: refundsLoading,
    isFetching: refundsFetching,
    isError: refundsIsError,
    error: refundsError,
    refetch: refetchRefunds,
  } = useRefunds({ supplierId, page: refundsPage, limit: 10 });

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier credit" onBack={() => router.back()} />
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return <PageSkeleton />;
  }

  const hasTransport = Number(data.totalTransportCharges) > 0;
  const hasReplacements = Number(data.totalReplacements ?? 0) > 0;
  const hasRefunds = Number(data.totalRefundsReceived ?? 0) > 0;
  const statCount = (4 + Number(hasTransport) + Number(hasReplacements) + Number(hasRefunds)) as 4 | 5 | 6 | 7;
  // Negative: we've paid more than we now owe (returns, a cancelled order's advance) — the supplier owes us.
  const owedToUs = Number(data.creditBalance) < 0 ? -Number(data.creditBalance) : 0;
  const showRefunds = owedToUs > 0 || (refunds?.meta.total ?? 0) > 0;

  /**
   * Cheque badge that opens only the transitions the backend allows right now:
   * PENDING → CLEARED / RETURNED, and CLEARED / RETURNED → PENDING within 1 day
   * of the status change. CLEARED ↔ RETURNED directly is never allowed.
   */
  function settlementStatusControl(payment: SupplierPayment) {
    if (!payment.chequeStatus) return <span className="text-muted-foreground">—</span>;
    if (payment.mode === 'CHEQUE' && payment.chequeStatus !== 'PENDING' && !canRevertToPending(payment)) {
      // Locked — say why instead of showing a dead control.
      return (
        <span title="Status is final — it can only be reverted to pending within 1 day of the last status change">
          <ChequeStatusBadge status={payment.chequeStatus} />
        </span>
      );
    }
    const busy = updateChequeStatus.isPending && updateChequeStatus.variables?.paymentId === payment.id;
    const options =
      payment.mode === 'CHEQUE' && payment.chequeStatus === 'PENDING'
        ? [
            { label: 'Pending', current: true, onSelect: () => undefined },
            { label: 'Mark Cleared', onSelect: () => markCheque(payment.id, 'CLEARED') },
            { label: 'Mark Returned', destructive: true, onSelect: () => markCheque(payment.id, 'RETURNED') },
          ]
        : payment.mode === 'CHEQUE' && canRevertToPending(payment)
          ? [{ label: 'Revert to Pending', onSelect: () => setRevertPayment(payment) }]
          : [];
    return (
      <StatusMenuBadge
        label="Change cheque status"
        busy={busy}
        badge={<ChequeStatusBadge status={payment.chequeStatus} />}
        options={options}
      />
    );
  }

  function settlementActions(payment: SupplierPayment) {
    return (
      <RowActionsMenu
        label="Settlement actions"
        groups={[
          [
            {
              label: 'Delete settlement',
              icon: Trash2,
              destructive: true,
              hidden: !canDeleteSettlement(payment),
              onSelect: () => setDeletePayment(payment),
            },
          ],
        ]}
      />
    );
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
      <PageHeader
        title={data.supplier.name}
        description="Credit (payable) history"
        onBack={() => router.back()}
        actions={
          <>
            {owedToUs > 0 && (
              <Button variant="outline" onClick={() => setRefundFormOpen(true)}>
                <HandCoins />
                Record Refund
              </Button>
            )}
            <Button onClick={() => setSettlementOpen(true)}>
              <Plus />
              Record Settlement
            </Button>
          </>
        }
      />

      {/* Balance = purchases − returns + replacements − settled − transport + refunds received.
          Replacements / refunds only show when non-zero. */}
      <div
        className={cn(
          'grid gap-4 sm:grid-cols-2',
          { 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-3', 7: 'xl:grid-cols-4' }[statCount],
        )}
      >
        <StatCard label="Total Purchases" value={formatCurrency(data.totalPurchases)} icon={Truck} />
        <StatCard label="Returns" value={`−${formatCurrency(data.totalReturns)}`} icon={Undo2} tone="warning" />
        {hasReplacements && (
          <StatCard
            label="Replacements"
            value={`+${formatCurrency(data.totalReplacements ?? 0)}`}
            icon={PackageCheck}
            hint="Goods received in place of returns"
          />
        )}
        {hasTransport && (
          <StatCard
            label="Transport Charges"
            value={`−${formatCurrency(data.totalTransportCharges)}`}
            icon={Truck}
            tone="warning"
            hint="Deducted from credit"
          />
        )}
        <StatCard label="Settled" value={`−${formatCurrency(data.totalSettled)}`} icon={Wallet} tone="success" />
        {hasRefunds && (
          <StatCard
            label="Refunds Received"
            value={`+${formatCurrency(data.totalRefundsReceived ?? 0)}`}
            icon={HandCoins}
            hint="Cash the supplier paid back"
          />
        )}
        {owedToUs > 0 ? (
          <StatCard
            label="Supplier Owes You"
            value={formatCurrency(owedToUs)}
            icon={Coins}
            tone="success"
            hint="Record the refund when it's received"
          />
        ) : (
          <StatCard label="Credit Balance" value={formatCurrency(data.creditBalance)} icon={Coins} hint="Currently owed" />
        )}
      </div>

      {/* Settlements */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Settlements" isFetching={settlementsFetching && !settlementsLoading} className="pb-3" />
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Input
              type="date"
              value={settlementsDateFrom}
              onChange={(e) => {
                setSettlementsDateFrom(e.target.value);
                setSettlementsPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={settlementsDateTo}
              onChange={(e) => {
                setSettlementsDateTo(e.target.value);
                setSettlementsPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
          </div>
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
            aria-label={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => {
              setSortOrder((v) => (v === 'desc' ? 'asc' : 'desc'));
              setSettlementsPage(1);
            }}
          >
            {sortOrder === 'desc' ? <ArrowDown /> : <ArrowUp />}
          </Button>
          {settlementsFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearSettlementsFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {settlementsLoading ? (
          <TableSkeleton rows={3} />
        ) : settlementsIsError ? (
          <QueryErrorState error={settlementsError} onRetry={() => refetchSettlements()} />
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
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.data.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-normal break-words">{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.mode.replace('_', ' ')}</TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {payment.reference ?? '—'}
                        {payment.bankName && <span className="block text-xs">{payment.bankName}</span>}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-medium tabular-nums">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{settlementStatusControl(payment)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.chequeDepositDate ? formatDate(payment.chequeDepositDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{settlementActions(payment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', settlementsFetching && 'opacity-60 transition-opacity')}>
              {settlements.data.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium">{payment.mode.replace('_', ' ')}</span>
                    <span className="shrink-0 break-words font-semibold tabular-nums">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(payment.paymentDate)}</span>
                    <span className="break-words text-right">
                      {payment.reference ?? '—'}
                      {payment.bankName ? ` · ${payment.bankName}` : ''}
                    </span>
                  </div>
                  {payment.chequeDepositDate && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Deposit {formatDate(payment.chequeDepositDate)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                    {settlementStatusControl(payment)}
                    {settlementActions(payment)}
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar meta={settlements.meta} onPageChange={setSettlementsPage} />
          </>
        )}
      </div>

      {/* Purchases */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Purchases" isFetching={purchasesFetching && !purchasesLoading} className="pb-3" />
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Input
              type="date"
              value={purchasesDateFrom}
              onChange={(e) => {
                setPurchasesDateFrom(e.target.value);
                setPurchasesPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={purchasesDateTo}
              onChange={(e) => {
                setPurchasesDateTo(e.target.value);
                setPurchasesPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
          </div>
          {purchasesFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearPurchasesFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {purchasesLoading ? (
          <TableSkeleton rows={3} />
        ) : purchasesIsError ? (
          <QueryErrorState error={purchasesError} onRetry={() => refetchPurchases()} />
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
                      <TableCell className="whitespace-normal break-words">
                        {formatDate(purchase.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {purchase.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-medium tabular-nums">
                        {formatCurrency(purchase.totalValue)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-right tabular-nums">
                        {Number(purchase.transportCharges) > 0 ? (
                          <span className="text-warning-foreground dark:text-warning">
                            −{formatCurrency(purchase.transportCharges)}
                          </span>
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
                  className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium text-primary">{purchase.invoiceNumber}</span>
                    <span className="shrink-0 break-words font-semibold tabular-nums">
                      {formatCurrency(purchase.totalValue)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{formatDate(purchase.purchaseDate)}</p>
                    {Number(purchase.transportCharges) > 0 && (
                      <p className="text-xs tabular-nums text-warning-foreground dark:text-warning">
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
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader
          title="Returns"
          description="Record returns from the order they came on, so it tracks what's left to return."
          isFetching={returnsFetching && !returnsLoading}
          className="pb-3"
        />
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Input
              type="date"
              value={returnsDateFrom}
              onChange={(e) => {
                setReturnsDateFrom(e.target.value);
                setReturnsPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={returnsDateTo}
              onChange={(e) => {
                setReturnsDateTo(e.target.value);
                setReturnsPage(1);
              }}
              className="min-w-0 w-full sm:w-auto"
            />
          </div>
          {returnsFiltersActive && (
            <Button variant="ghost" size="sm" onClick={clearReturnsFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {returnsLoading ? (
          <TableSkeleton rows={3} />
        ) : returnsIsError ? (
          <QueryErrorState error={returnsError} onRetry={() => refetchReturns()} />
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
                    <TableHead>Order</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseReturns.data.map((purchaseReturn) => (
                    <TableRow key={purchaseReturn.id}>
                      <TableCell className="whitespace-normal break-words">
                        {formatDate(purchaseReturn.returnDate)}
                      </TableCell>
                      <TableCell className="font-medium">{purchaseReturn.returnNumber}</TableCell>
                      <TableCell className="whitespace-normal">{returnOrder(purchaseReturn)}</TableCell>
                      <TableCell className="whitespace-normal break-words">{purchaseReturn.reason}</TableCell>
                      <TableCell className="whitespace-normal break-words text-right font-medium tabular-nums text-destructive">
                        −{formatCurrency(purchaseReturn.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', returnsFetching && 'opacity-60 transition-opacity')}>
              {purchaseReturns.data.map((purchaseReturn) => (
                <div key={purchaseReturn.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="break-words font-medium">{purchaseReturn.returnNumber}</span>
                    <span className="shrink-0 break-words font-semibold tabular-nums text-destructive">
                      −{formatCurrency(purchaseReturn.totalAmount)}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{purchaseReturn.reason}</p>
                  <div className="mt-1 text-xs">{returnOrder(purchaseReturn)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(purchaseReturn.returnDate)}</p>
                </div>
              ))}
            </div>

            <PaginationBar meta={purchaseReturns.meta} onPageChange={setReturnsPage} />
          </>
        )}
      </div>

      {showRefunds && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <SectionHeader
            title="Refunds received"
            description="Money the supplier paid back. A cheque counts in Liquid Cash only once marked cleared."
            isFetching={refundsFetching && !refundsLoading}
            className="pb-3"
          />
          {refundsLoading ? (
            <TableSkeleton rows={2} />
          ) : refundsIsError ? (
            <QueryErrorState error={refundsError} onRetry={() => refetchRefunds()} />
          ) : !refunds || refunds.data.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="Nothing received yet"
              description={`${data.supplier.name} owes you ${formatCurrency(owedToUs)}. Record it when it's paid back.`}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Refund #</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.data.map((refund) => (
                      <TableRow key={refund.id} className={cn(refund.cancelledAt && 'opacity-60')}>
                        <TableCell>{formatDate(refund.refundDate)}</TableCell>
                        <TableCell className="font-medium">{refund.refundNumber}</TableCell>
                        <TableCell>
                          {refund.purchase ? (
                            <Link
                              href={`/admin/purchases/${refund.purchase.id}`}
                              className="text-primary hover:underline"
                            >
                              #{refund.purchase.invoiceNumber}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {refund.mode === 'BANK_TRANSFER' ? 'Bank transfer' : refund.mode === 'CHEQUE' ? 'Cheque' : 'Cash'}
                          {refund.mode === 'CHEQUE' && refund.chequeNumber && (
                            <div className="text-xs text-muted-foreground">#{refund.chequeNumber}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {refundActions.statusControl(refund) ??
                              (!refund.cancelledAt && <span className="text-sm text-success">Received</span>)}
                            {refundActions.cancelledBadge(refund)}
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn('text-right font-medium tabular-nums', refund.cancelledAt && 'line-through')}
                        >
                          +{formatCurrency(refund.amount)}
                        </TableCell>
                        <TableCell>{refundActions.menu(refund)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar meta={refunds.meta} onPageChange={setRefundsPage} />
            </>
          )}
        </div>
      )}

      <RefundFormDialog
        open={refundFormOpen}
        onOpenChange={setRefundFormOpen}
        supplier={{ id: data.supplier.id, name: data.supplier.name }}
      />
      {refundActions.dialogs}

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
            <AlertDialogAction onClick={confirmRevert} disabled={updateChequeStatus.isPending}>
              Revert to Pending
            </AlertDialogAction>
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
              {deletePayment?.reference ? ` (${deletePayment.reference})` : ''} and restores the credit balance. Only
              available within 1 day of recording it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteSettlement.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
