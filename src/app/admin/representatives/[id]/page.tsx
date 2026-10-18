'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Ban,
  Copy,
  Eraser,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  AccountStatusBadge,
  RepresentativeStatusBadge,
  SettlementStatusBadge,
} from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { PageSkeleton, TableSkeleton } from '@/components/loading-state';
import { RepresentativeFormDialog } from '@/components/admin/representative-form-dialog';
import { AssignProductDialog } from '@/components/admin/assign-product-dialog';
import {
  useClearRepresentativeActivityLog,
  useDeleteRepresentative,
  useForceRepresentativePasswordChange,
  useRemoveProductAssignment,
  useRepresentative,
  useRepresentativeActivityLog,
  useRepresentativeAssignedBanners,
  useRepresentativeAssignedCustomers,
  useRepresentativeAssignedProducts,
  useRepresentativeCommissionStats,
  useRepresentativeLoginHistory,
  useRepresentativeSalesStats,
  useRepresentativeSettlements,
  useResetRepresentativePassword,
  useUnlockRepresentative,
} from '@/hooks/use-representatives';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';

function TabLoader() {
  return <TableSkeleton rows={3} />;
}

const PANEL = 'overflow-hidden rounded-xl border border-border bg-card shadow-xs';

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function RepresentativeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [clearLogOpen, setClearLogOpen] = useState(false);

  const resetPassword = useResetRepresentativePassword();
  const deleteRep = useDeleteRepresentative();
  const unlockRep = useUnlockRepresentative();
  const forcePasswordChange = useForceRepresentativePasswordChange();
  const clearActivityLog = useClearRepresentativeActivityLog(id);
  const removeAssignment = useRemoveProductAssignment(id);

  const { data: rep, isLoading, isError, error, refetch } = useRepresentative(id);
  const {
    data: salesStats,
    isLoading: salesLoading,
    isError: salesIsError,
    error: salesError,
    refetch: refetchSales,
  } = useRepresentativeSalesStats(id);
  const {
    data: commissionStats,
    isLoading: commissionLoading,
    isError: commissionIsError,
    error: commissionError,
    refetch: refetchCommission,
  } = useRepresentativeCommissionStats(id);
  const {
    data: assignedProducts,
    isLoading: assignedProductsLoading,
    isFetching: assignedProductsFetching,
    isError: assignedProductsIsError,
    error: assignedProductsError,
    refetch: refetchAssignedProducts,
  } = useRepresentativeAssignedProducts(id);
  const {
    data: assignedBanners,
    isLoading: assignedBannersLoading,
    isFetching: assignedBannersFetching,
    isError: assignedBannersIsError,
    error: assignedBannersError,
    refetch: refetchAssignedBanners,
  } = useRepresentativeAssignedBanners(id);
  const {
    data: assignedCustomers,
    isLoading: customersLoading,
    isFetching: customersFetching,
    isError: customersIsError,
    error: customersError,
    refetch: refetchCustomers,
  } = useRepresentativeAssignedCustomers(id, { limit: 10 });
  const {
    data: settlements,
    isLoading: settlementsLoading,
    isFetching: settlementsFetching,
    isError: settlementsIsError,
    error: settlementsError,
    refetch: refetchSettlements,
  } = useRepresentativeSettlements(id, { limit: 10 });
  const {
    data: loginHistory,
    isLoading: loginHistoryLoading,
    isFetching: loginHistoryFetching,
    isError: loginHistoryIsError,
    error: loginHistoryError,
    refetch: refetchLoginHistory,
  } = useRepresentativeLoginHistory(id, { limit: 10 });
  const {
    data: activityLog,
    isLoading: activityLoading,
    isFetching: activityFetching,
    isError: activityIsError,
    error: activityError,
    refetch: refetchActivity,
  } = useRepresentativeActivityLog(id, { limit: 10 });

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Representative" onBack={() => router.back()} />
        <div className={PANEL}>
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (isLoading || !rep) {
    return <PageSkeleton cards={4} />;
  }

  const isLocked = !!rep.lockedUntil && new Date(rep.lockedUntil) > new Date();

  function handleResetPassword() {
    resetPassword.mutate(rep!.id, {
      onSuccess: (result) =>
        setCredentials({ username: rep!.username, temporaryPassword: result.temporaryPassword }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleUnlock() {
    unlockRep.mutate(rep!.id, {
      onSuccess: () => toast.success('Login lockout cleared'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleForcePasswordChange() {
    forcePasswordChange.mutate(rep!.id, {
      onSuccess: () => toast.success('Password change will be required on next login'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function confirmDelete() {
    deleteRep.mutate(rep!.id, {
      onSuccess: () => {
        toast.success('Representative deleted');
        router.push('/admin/representatives');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteOpen(false);
      },
    });
  }

  function confirmClearLog() {
    clearActivityLog.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Cleared ${result.count} log entr${result.count === 1 ? 'y' : 'ies'}`);
        setClearLogOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={rep.name}
        onBack={() => router.back()}
        description={
          <span className="tabular-nums">
            {rep.email} &middot; {rep.phone}
          </span>
        }
        meta={
          <>
            <RepresentativeStatusBadge status={rep.status} />
            {isLocked && (
              <Badge variant="destructive">
                <Lock />
                Locked
              </Badge>
            )}
            {rep.mustChangePassword && <Badge variant="warning">Password change pending</Badge>}
          </>
        }
        actions={
          <>
            {isLocked && (
              <Button variant="outline" onClick={handleUnlock} loading={unlockRep.isPending}>
                <Unlock />
                Unlock
              </Button>
            )}
            <Button variant="outline" onClick={handleResetPassword} loading={resetPassword.isPending}>
              <KeyRound />
              Reset password
            </Button>
            <Button variant="outline" onClick={handleForcePasswordChange} loading={forcePasswordChange.isPending}>
              <ShieldAlert />
              Force change
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              Delete
            </Button>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={rep.summary.totalCustomers} icon={Users} />
        <StatCard label="Total Orders" value={rep.summary.totalOrders} icon={ShoppingCart} />
        <StatCard
          label="Lifetime Completed Value"
          value={formatCurrency(rep.summary.lifetimeCompletedValue)}
          icon={Receipt}
        />
        <StatCard
          label="Pending Commission"
          value={commissionLoading ? '…' : formatCurrency(commissionStats?.pendingCommission ?? 0)}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">
              Assigned Products
              {assignedProductsFetching && !assignedProductsLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="banners">Assigned Banners</TabsTrigger>
            <TabsTrigger value="customers">
              Assigned Customers
              {customersFetching && !customersLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="sales-stats">Sales Statistics</TabsTrigger>
            <TabsTrigger value="commission-stats">Commission Statistics</TabsTrigger>
            <TabsTrigger value="settlements">
              Settlement History
              {settlementsFetching && !settlementsLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="login-history">
              Login History
              {loginHistoryFetching && !loginHistoryLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity History
              {activityFetching && !activityLoading && <Loader2 className="ml-1.5 size-3.5 animate-spin" />}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className={PANEL}>
            <SectionHeader title="Profile" description="Account and contact details" className="pb-3" />
            <div className="grid gap-x-6 gap-y-4 border-t border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <DetailField label="Full name" value={rep.name} />
              <DetailField label="Email / Username" value={rep.email} />
              <DetailField label="Phone" value={<span className="tabular-nums">{rep.phone}</span>} />
              <DetailField label="NIC / Employee ID" value={rep.nicOrEmployeeId ?? '—'} />
              <DetailField label="Address" value={rep.address ?? '—'} />
              <DetailField label="Joining date" value={formatDate(rep.joiningDate)} />
              <DetailField label="Last login" value={rep.lastLoginAt ? formatDate(rep.lastLoginAt) : 'Never'} />
              <DetailField
                label="Failed login attempts"
                value={<span className="tabular-nums">{rep.failedLoginAttempts}</span>}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className={PANEL}>
            <SectionHeader
              title="Assigned products"
              description="Opt-in catalog scope — with no assignments, this representative sees every active product."
              isFetching={assignedProductsFetching && !assignedProductsLoading}
              className="pb-3"
              actions={
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <Plus />
                  Assign scope
                </Button>
              }
            />
            <div className="border-t border-border">
              {assignedProductsLoading ? (
                <TabLoader />
              ) : assignedProductsIsError ? (
                <QueryErrorState error={assignedProductsError} onRetry={() => refetchAssignedProducts()} />
              ) : !assignedProducts || assignedProducts.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="No scopes assigned" description="This representative can see the entire active catalog" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scope</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedProducts.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <Badge variant="outline">{assignment.scopeType}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{assignment.scopeValue}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">{formatDate(assignment.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                aria-label="Remove assignment"
                                onClick={() =>
                                  removeAssignment.mutate(assignment.id, {
                                    onSuccess: () => toast.success('Assignment removed'),
                                    onError: (error) => toast.error(getErrorMessage(error)),
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {assignedProducts.map((assignment) => (
                      <div key={assignment.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="break-words font-medium">{assignment.scopeValue}</div>
                            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                              Assigned {formatDate(assignment.createdAt)}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {assignment.scopeType}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            aria-label="Remove assignment"
                            onClick={() =>
                              removeAssignment.mutate(assignment.id, {
                                onSuccess: () => toast.success('Assignment removed'),
                                onError: (error) => toast.error(getErrorMessage(error)),
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="banners">
          <div className={PANEL}>
            <SectionHeader
              title="Assigned banners"
              isFetching={assignedBannersFetching && !assignedBannersLoading}
              className="pb-3"
            />
            <div className="border-t border-border">
              {assignedBannersLoading ? (
                <TabLoader />
              ) : assignedBannersIsError ? (
                <QueryErrorState error={assignedBannersError} onRetry={() => refetchAssignedBanners()} />
              ) : !assignedBanners || assignedBanners.length === 0 ? (
                <EmptyState
                  icon={Ban}
                  title="No banners assigned"
                  description="This representative sees the global active banner rotation. Assign banners from the Banners screen."
                />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Banner</TableHead>
                          <TableHead className="text-right">Priority</TableHead>
                          <TableHead>Window</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedBanners.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">{assignment.banner.title ?? assignment.bannerId}</TableCell>
                            <TableCell className="text-right tabular-nums">{assignment.priority}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {assignment.startsAt ? formatDate(assignment.startsAt) : 'Always'} –{' '}
                              {assignment.expiresAt ? formatDate(assignment.expiresAt) : 'No expiry'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {assignedBanners.map((assignment) => (
                      <div key={assignment.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words font-medium">
                            {assignment.banner.title ?? assignment.bannerId}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            Priority <span className="font-medium text-foreground">{assignment.priority}</span>
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                          {assignment.startsAt ? formatDate(assignment.startsAt) : 'Always'} –{' '}
                          {assignment.expiresAt ? formatDate(assignment.expiresAt) : 'No expiry'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className={PANEL}>
            <SectionHeader
              title="Assigned customers"
              isFetching={customersFetching && !customersLoading}
              className="pb-3"
            />
            <div className="border-t border-border">
              {customersLoading ? (
                <TabLoader />
              ) : customersIsError ? (
                <QueryErrorState error={customersError} onRetry={() => refetchCustomers()} />
              ) : !assignedCustomers || assignedCustomers.data.length === 0 ? (
                <EmptyState icon={Users} title="No customers registered yet" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedCustomers.data.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <Link href={`/admin/dealers/${customer.id}`} className="font-medium text-primary">
                                {customer.businessName}
                              </Link>
                            </TableCell>
                            <TableCell className="tabular-nums">{customer.phone}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(customer.outstandingBalance)}
                            </TableCell>
                            <TableCell>
                              <AccountStatusBadge status={customer.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {assignedCustomers.data.map((customer) => (
                      <div key={customer.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/admin/dealers/${customer.id}`}
                            className="min-w-0 break-words font-medium text-primary"
                          >
                            {customer.businessName}
                          </Link>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(customer.outstandingBalance)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">{customer.phone}</span>
                          <AccountStatusBadge status={customer.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales-stats">
          {salesLoading ? (
            <TabLoader />
          ) : salesIsError ? (
            <div className={PANEL}>
              <QueryErrorState error={salesError} onRetry={() => refetchSales()} />
            </div>
          ) : !salesStats ? (
            <TabLoader />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Today's Orders" value={salesStats.todaysOrders} icon={ShoppingCart} />
              <StatCard label="Monthly Orders" value={salesStats.monthlyOrders} icon={ShoppingCart} />
              <StatCard label="Pending Approval" value={salesStats.pendingOrders} icon={ShoppingCart} tone="warning" />
              <StatCard label="Completed" value={salesStats.completedOrders} icon={ShoppingCart} tone="success" />
              <StatCard label="Revenue" value={formatCurrency(salesStats.revenue)} icon={Wallet} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="commission-stats">
          {commissionLoading ? (
            <TabLoader />
          ) : commissionIsError ? (
            <div className={PANEL}>
              <QueryErrorState error={commissionError} onRetry={() => refetchCommission()} />
            </div>
          ) : !commissionStats ? (
            <TabLoader />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Pending" value={formatCurrency(commissionStats.pendingCommission)} icon={Wallet} tone="warning" />
              <StatCard label="Approved" value={formatCurrency(commissionStats.approvedCommission)} icon={Wallet} tone="info" />
              <StatCard label="Paid" value={formatCurrency(commissionStats.paidCommission)} icon={Wallet} tone="success" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="settlements">
          <div className={PANEL}>
            <SectionHeader
              title="Settlement history"
              isFetching={settlementsFetching && !settlementsLoading}
              className="pb-3"
            />
            <div className="border-t border-border">
              {settlementsLoading ? (
                <TabLoader />
              ) : settlementsIsError ? (
                <QueryErrorState error={settlementsError} onRetry={() => refetchSettlements()} />
              ) : !settlements || settlements.data.length === 0 ? (
                <EmptyState icon={Receipt} title="No settlements yet" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Settlement #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settlements.data.map((settlement) => (
                          <TableRow key={settlement.id}>
                            <TableCell>
                              <Link href={`/admin/commission/settlements/${settlement.id}`} className="font-medium text-primary">
                                {settlement.settlementNumber}
                              </Link>
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(settlement.totalCommission)}
                            </TableCell>
                            <TableCell>
                              <SettlementStatusBadge status={settlement.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {settlements.data.map((settlement) => (
                      <div key={settlement.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/admin/commission/settlements/${settlement.id}`}
                            className="min-w-0 break-words font-medium text-primary"
                          >
                            {settlement.settlementNumber}
                          </Link>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(settlement.totalCommission)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="tabular-nums">
                            {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                          </span>
                          <SettlementStatusBadge status={settlement.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="login-history">
          <div className={PANEL}>
            <SectionHeader
              title="Login history"
              isFetching={loginHistoryFetching && !loginHistoryLoading}
              className="pb-3"
            />
            <div className="border-t border-border">
              {loginHistoryLoading ? (
                <TabLoader />
              ) : loginHistoryIsError ? (
                <QueryErrorState error={loginHistoryError} onRetry={() => refetchLoginHistory()} />
              ) : !loginHistory || loginHistory.data.length === 0 ? (
                <EmptyState icon={Lock} title="No login history yet" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead className="hidden lg:table-cell">User Agent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginHistory.data.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="tabular-nums">{formatDate(entry.loginAt)}</TableCell>
                            <TableCell>
                              {entry.success ? (
                                <Badge variant="success">Success</Badge>
                              ) : (
                                <Badge variant="destructive">{entry.failureReason ?? 'Failed'}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{entry.ipAddress ?? '—'}</TableCell>
                            <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground lg:table-cell">
                              {entry.userAgent ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {loginHistory.data.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium tabular-nums">{formatDate(entry.loginAt)}</span>
                          <span className="shrink-0">
                            {entry.success ? (
                              <Badge variant="success">Success</Badge>
                            ) : (
                              <Badge variant="destructive">{entry.failureReason ?? 'Failed'}</Badge>
                            )}
                          </span>
                        </div>
                        <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
                          {entry.ipAddress ?? '—'}
                        </div>
                        <div className="mt-1 break-words text-xs text-muted-foreground">{entry.userAgent ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className={PANEL}>
            <SectionHeader
              title="Activity history"
              isFetching={activityFetching && !activityLoading}
              className="pb-3"
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setClearLogOpen(true)}
                  disabled={!activityLog || activityLog.data.length === 0}
                >
                  <Eraser />
                  Clear log
                </Button>
              }
            />
            <div className="border-t border-border">
              {activityLoading ? (
                <TabLoader />
              ) : activityIsError ? (
                <QueryErrorState error={activityError} onRetry={() => refetchActivity()} />
              ) : !activityLog || activityLog.data.length === 0 ? (
                <EmptyState icon={ShieldAlert} title="No activity recorded yet" />
              ) : (
                <>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead className="hidden lg:table-cell">Details</TableHead>
                          <TableHead className="hidden lg:table-cell">IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLog.data.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="tabular-nums">{formatDate(entry.createdAt)}</TableCell>
                            <TableCell className="font-medium">{entry.action.replaceAll('_', ' ')}</TableCell>
                            <TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                              {entry.details ?? '—'}
                            </TableCell>
                            <TableCell className="hidden font-mono text-xs lg:table-cell">{entry.ipAddress ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 lg:hidden">
                    {activityLog.data.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 break-words font-medium">{entry.action.replaceAll('_', ' ')}</span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 break-words text-xs text-muted-foreground">{entry.details ?? '—'}</div>
                        <div className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          {entry.ipAddress ?? '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <RepresentativeFormDialog open={editOpen} onOpenChange={setEditOpen} representative={rep} />
      <AssignProductDialog
        key={assignOpen ? 'assign-open' : 'assign-closed'}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        representativeId={rep.id}
      />

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Representative credentials">
          <DialogHeader>
            <DialogTitle>Representative credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the representative. This password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono text-sm">{credentials.username}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Temporary password</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Copy password"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {rep.name}&apos;s account. This only works if the representative has no
              customers, orders, or other related records — otherwise block the account instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteRep.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearLogOpen} onOpenChange={setClearLogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear activity log?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every recorded activity log entry for {rep.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearLog}
              disabled={clearActivityLog.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Clear log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
