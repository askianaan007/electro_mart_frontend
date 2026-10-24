'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { AccountStatusBadge } from '@/components/status-badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DealerFormDialog } from '@/components/admin/dealer-form-dialog';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
import { useCustomer, useDeleteDealer, useResetDealerPassword, useSetDealerStatus } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Dealer } from '@/lib/api/types';

function DealerRowActions({
  dealer,
  onPasswordReset,
  onDeleteRequest,
}: {
  dealer: Dealer;
  onPasswordReset: (credentials: { username: string; temporaryPassword: string }) => void;
  onDeleteRequest: () => void;
}) {
  const setStatus = useSetDealerStatus(dealer.id);
  const resetPassword = useResetDealerPassword();

  function toggleStatus() {
    const next = dealer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatus.mutate(next, {
      onSuccess: () => toast.success(`Dealer ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleResetPassword() {
    resetPassword.mutate(dealer.id, {
      onSuccess: (result) =>
        onPasswordReset({ username: dealer.username, temporaryPassword: result.temporaryPassword }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={`/admin/dealers/${dealer.id}`} className="flex items-center gap-2">
            <ArrowUpRight className="size-3.5" />
            <span>View Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetPassword.isPending} className="cursor-pointer">
          <KeyRound className="size-3.5" />
          <span>Reset Password</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleStatus} disabled={setStatus.isPending} className="cursor-pointer">
          <CheckCircle2 className="size-3.5" />
          <span>{dealer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest} className="cursor-pointer">
          <Trash2 className="size-3.5" />
          <span>Delete Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Owed by the dealer (positive) or held as their credit (negative). */
function dealerBalance(dealer: Dealer) {
  return Number(dealer.balance ?? dealer.outstandingBalance);
}

function DealerBalance({ dealer }: { dealer: Dealer }) {
  const balance = dealerBalance(dealer);
  if (balance < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <span>{formatCurrency(Math.abs(balance))}</span>
        <span className="text-[10px] font-semibold uppercase">Cr</span>
      </span>
    );
  }
  if (balance > 0) {
    return <span className="text-warning-foreground dark:text-warning">{formatCurrency(balance)}</span>;
  }
  return <span className="text-muted-foreground">{formatCurrency(0)}</span>;
}

export default function CustomerPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | undefined>(undefined);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [deletingDealer, setDeletingDealer] = useState<Dealer | null>(null);
  const deleteDealer = useDeleteDealer();

  const { data, isLoading, isFetching, isError, error, refetch } = useCustomer({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
  });

  const filtersActive = !!search || status !== 'all';

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setPage(1);
  }

  function openCreate() {
    setEditingDealer(undefined);
    setFormOpen(true);
  }

  function openEdit(dealer: Dealer) {
    setEditingDealer(dealer);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingDealer) return;
    deleteDealer.mutate(deletingDealer.id, {
      onSuccess: () => {
        toast.success('Dealer deleted');
        setDeletingDealer(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingDealer(null);
      },
    });
  }

  // Summary Metrics Calculations
  const dealersList = data?.data ?? [];
  const totalDealersCount = data?.meta?.total ?? 0;
  const activeDealersCount = dealersList.filter((d) => d.status === 'ACTIVE').length;
  // Across all dealers (not just this page); credit is shown apart instead of netted off.
  const totalOwed = Number(data?.totals?.owed ?? 0);
  const totalCredit = Number(data?.totals?.credit ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dealers"
        description="Manage authorized dealer accounts, assign credit limits, track balances, and issue credentials."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add New Dealer
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Registered Dealers"
          value={isLoading ? '—' : totalDealersCount}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Active Accounts"
          value={isLoading ? '—' : activeDealersCount}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Total Outstanding Balance"
          value={isLoading ? '—' : formatCurrency(totalOwed)}
          icon={Wallet}
          tone="warning"
          hint={totalCredit > 0 ? `${formatCurrency(totalCredit)} held as dealer credit` : undefined}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="Dealer directory" isFetching={isFetching && !isLoading} className="pb-3" />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by business, owner, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active Only</SelectItem>
              <SelectItem value="INACTIVE">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching dealers"
              description="Try adjusting or clearing your search term and status filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No dealers registered yet"
              description="Add your first dealer account to get started with credit management"
            />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Business &amp; Username</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact Phone</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {dealer.businessName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/dealers/${dealer.id}`}
                              className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {dealer.businessName}
                            </Link>
                            <div className="text-xs text-muted-foreground">@{dealer.username}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        {dealer.ownerName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3.5 text-muted-foreground" />
                            {dealer.ownerName}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {dealer.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-3.5" />
                            {dealer.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <CreditCard className="size-3.5 text-muted-foreground" />
                          {dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(dealer.creditLimit)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-medium tabular-nums">
                        <DealerBalance dealer={dealer} />
                      </TableCell>

                      <TableCell>
                        <AccountStatusBadge status={dealer.status} />
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(dealer)}>
                            Edit
                          </Button>
                          <DealerRowActions
                            dealer={dealer}
                            onPasswordReset={setCredentials}
                            onDeleteRequest={() => setDeletingDealer(dealer)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((dealer) => (
                <div key={dealer.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {dealer.businessName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/dealers/${dealer.id}`} className="block truncate font-medium text-foreground">
                          {dealer.businessName}
                        </Link>
                        <div className="text-xs text-muted-foreground">@{dealer.username}</div>
                      </div>
                    </div>

                    <AccountStatusBadge status={dealer.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {dealerBalance(dealer) < 0 ? 'Credit' : 'Outstanding'}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        <DealerBalance dealer={dealer} />
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(dealer)}>
                        Edit
                      </Button>
                      <DealerRowActions
                        dealer={dealer}
                        onPasswordReset={setCredentials}
                        onDeleteRequest={() => setDeletingDealer(dealer)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <DealerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        dealer={editingDealer}
        onCreated={setCredentials}
      />

      {/* Credentials Dialog */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Dealer Login Credentials" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dealer Login Credentials</DialogTitle>
            <DialogDescription>
              Provide these initial credentials to the dealer. The password cannot be retrieved again after closing.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{credentials.username}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy password"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                    className="size-8"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCredentials(null)} className="w-full">
              Done &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDealer} onOpenChange={(open) => !open && setDeletingDealer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dealer account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deletingDealer?.businessName}&apos;s account. This is only permitted if the dealer has zero orders, invoices, or payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: 'destructive' })}>
              Delete Dealer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
