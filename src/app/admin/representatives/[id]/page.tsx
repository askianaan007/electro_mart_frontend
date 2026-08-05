'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  RepresentativeStatusBadge,
  SettlementStatusBadge,
} from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
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
  return (
    <div className="space-y-2 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
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
  const { data: salesStats, isLoading: salesLoading } = useRepresentativeSalesStats(id);
  const { data: commissionStats, isLoading: commissionLoading } = useRepresentativeCommissionStats(id);
  const {
    data: assignedProducts,
    isLoading: assignedProductsLoading,
    isFetching: assignedProductsFetching,
  } = useRepresentativeAssignedProducts(id);
  const { data: assignedBanners, isLoading: assignedBannersLoading } = useRepresentativeAssignedBanners(id);
  const {
    data: assignedCustomers,
    isLoading: customersLoading,
    isFetching: customersFetching,
  } = useRepresentativeAssignedCustomers(id, { limit: 10 });
  const {
    data: settlements,
    isLoading: settlementsLoading,
    isFetching: settlementsFetching,
  } = useRepresentativeSettlements(id, { limit: 10 });
  const {
    data: loginHistory,
    isLoading: loginHistoryLoading,
    isFetching: loginHistoryFetching,
  } = useRepresentativeLoginHistory(id, { limit: 10 });
  const {
    data: activityLog,
    isLoading: activityLoading,
    isFetching: activityFetching,
  } = useRepresentativeActivityLog(id, { limit: 10 });

  if (isError) {
    return <QueryErrorState error={error} onRetry={() => refetch()} />;
  }

  if (isLoading || !rep) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
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
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft />
        Back
      </Button>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{rep.name}</h1>
            <RepresentativeStatusBadge status={rep.status} />
            {isLocked && (
              <Badge variant="destructive">
                <Lock className="mr-1 size-3" />
                Locked
              </Badge>
            )}
            {rep.mustChangePassword && <Badge variant="warning">Password change pending</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {rep.email} &middot; {rep.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Full name</p>
                <p className="text-sm font-medium">{rep.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email / Username</p>
                <p className="text-sm font-medium">{rep.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{rep.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">NIC / Employee ID</p>
                <p className="text-sm font-medium">{rep.nicOrEmployeeId ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">{rep.address ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joining date</p>
                <p className="text-sm font-medium">{formatDate(rep.joiningDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last login</p>
                <p className="text-sm font-medium">{rep.lastLoginAt ? formatDate(rep.lastLoginAt) : 'Never'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Failed login attempts</p>
                <p className="text-sm font-medium">{rep.failedLoginAttempts}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Opt-in catalog scope — with no assignments, this representative sees every active product.
                </p>
                <Button size="sm" onClick={() => setAssignOpen(true)}>
                  <Plus />
                  Assign scope
                </Button>
              </div>
              {assignedProductsLoading ? (
                <TabLoader />
              ) : !assignedProducts || assignedProducts.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="No scopes assigned" description="This representative can see the entire active catalog" />
              ) : (
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
                        <TableCell>{formatDate(assignment.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeAssignment.mutate(assignment.id, {
                                onSuccess: () => toast.success('Assignment removed'),
                                onError: (error) => toast.error(getErrorMessage(error)),
                              })
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banners">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {assignedBannersLoading ? (
                <TabLoader />
              ) : !assignedBanners || assignedBanners.length === 0 ? (
                <EmptyState
                  icon={Ban}
                  title="No banners assigned"
                  description="This representative sees the global active banner rotation. Assign banners from the Banners screen."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banner</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Window</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedBanners.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.banner.title ?? assignment.bannerId}</TableCell>
                        <TableCell>{assignment.priority}</TableCell>
                        <TableCell>
                          {assignment.startsAt ? formatDate(assignment.startsAt) : 'Always'} –{' '}
                          {assignment.expiresAt ? formatDate(assignment.expiresAt) : 'No expiry'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {customersLoading ? (
                <TabLoader />
              ) : !assignedCustomers || assignedCustomers.data.length === 0 ? (
                <EmptyState icon={Users} title="No customers registered yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Outstanding</TableHead>
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
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{formatCurrency(customer.outstandingBalance)}</TableCell>
                        <TableCell>{customer.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-stats">
          {salesLoading || !salesStats ? (
            <TabLoader />
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="Today's Orders" value={salesStats.todaysOrders} icon={ShoppingCart} />
              <StatCard label="Monthly Orders" value={salesStats.monthlyOrders} icon={ShoppingCart} />
              <StatCard label="Pending Approval" value={salesStats.pendingOrders} icon={ShoppingCart} tone="warning" />
              <StatCard label="Completed" value={salesStats.completedOrders} icon={ShoppingCart} tone="success" />
              <StatCard label="Revenue" value={formatCurrency(salesStats.revenue)} icon={Wallet} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="commission-stats">
          {commissionLoading || !commissionStats ? (
            <TabLoader />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Pending" value={formatCurrency(commissionStats.pendingCommission)} icon={Wallet} tone="warning" />
              <StatCard label="Approved" value={formatCurrency(commissionStats.approvedCommission)} icon={Wallet} />
              <StatCard label="Paid" value={formatCurrency(commissionStats.paidCommission)} icon={Wallet} tone="success" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="settlements">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {settlementsLoading ? (
                <TabLoader />
              ) : !settlements || settlements.data.length === 0 ? (
                <EmptyState icon={Receipt} title="No settlements yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
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
                        <TableCell>
                          {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                        </TableCell>
                        <TableCell>{formatCurrency(settlement.totalCommission)}</TableCell>
                        <TableCell>
                          <SettlementStatusBadge status={settlement.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login-history">
          <Card>
            <CardContent className="p-0 sm:p-0">
              {loginHistoryLoading ? (
                <TabLoader />
              ) : !loginHistory || loginHistory.data.length === 0 ? (
                <EmptyState icon={Lock} title="No login history yet" />
              ) : (
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
                        <TableCell>{formatDate(entry.loginAt)}</TableCell>
                        <TableCell>
                          {entry.success ? (
                            <Badge variant="success">Success</Badge>
                          ) : (
                            <Badge variant="destructive">{entry.failureReason ?? 'Failed'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{entry.ipAddress ?? '—'}</TableCell>
                        <TableCell className="hidden max-w-xs truncate lg:table-cell">
                          {entry.userAgent ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-0 sm:p-0">
              <div className="flex items-center justify-end p-4">
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
              </div>
              {activityLoading ? (
                <TabLoader />
              ) : !activityLog || activityLog.data.length === 0 ? (
                <EmptyState icon={ShieldAlert} title="No activity recorded yet" />
              ) : (
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
                        <TableCell>{formatDate(entry.createdAt)}</TableCell>
                        <TableCell className="font-medium">{entry.action.replaceAll('_', ' ')}</TableCell>
                        <TableCell className="hidden max-w-xs truncate lg:table-cell">{entry.details ?? '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell">{entry.ipAddress ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono text-sm">{credentials.username}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Temporary password</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear log
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
