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
  ShieldAlert,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
        <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-muted">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl border-border/60 shadow-xl backdrop-blur-2xl">
        <DropdownMenuItem asChild className="rounded-xl font-bold cursor-pointer">
          <Link href={`/admin/dealers/${dealer.id}`} className="flex items-center gap-2">
            <span>View Profile</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetPassword.isPending} className="rounded-xl font-semibold cursor-pointer">
          <KeyRound className="size-3.5 mr-1.5" />
          <span>Reset Password</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleStatus} disabled={setStatus.isPending} className="rounded-xl font-semibold cursor-pointer">
          <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-500" />
          <span>{dealer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest} className="rounded-xl font-bold cursor-pointer">
          <Trash2 className="size-3.5 mr-1.5" />
          <span>Delete Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const totalOutstanding = dealersList.reduce((sum, d) => sum + Number(d.outstandingBalance), 0);

  return (
    <div className="space-y-6 select-none">
      {/* Top Header & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Users className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Dealers Directory
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Manage authorized dealer accounts, assign credit limits, track balances, and issue credentials
          </p>
        </div>

        <Button onClick={openCreate} className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all h-10 shrink-0">
          <Plus className="size-4" />
          <span>Add New Dealer</span>
        </Button>
      </div>

      {/* 3 Quick Dealer KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* KPI 1: Total Dealers */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Registered Dealers
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : totalDealersCount}
          </div>
        </div>

        {/* KPI 2: Active Accounts */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Active Accounts
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : activeDealersCount}
          </div>
        </div>

        {/* KPI 3: Total Outstanding Balance */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Outstanding Balance
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Main Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all">
        {/* Specular Shimmer Top Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="Dealer Directory" isFetching={isFetching && !isLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by business, owner, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-semibold"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/60 shadow-xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active Only</SelectItem>
              <SelectItem value="INACTIVE">Inactive Only</SelectItem>
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="rounded-full text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              <span>Clear filters</span>
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching dealers"
              description="Try adjusting or clearing your search term and status filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Users} title="No dealers registered yet" description="Add your first dealer account to get started with credit management" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', isFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table className="min-w-[750px]">
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Business &amp; Username
                      </TableHead>
                      <TableHead className="hidden font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground lg:table-cell">
                        Owner Name
                      </TableHead>
                      <TableHead className="hidden font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground lg:table-cell">
                        Contact Phone
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Credit Limit
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Outstanding Balance
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {data.data.map((dealer) => (
                      <TableRow key={dealer.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-xs shrink-0">
                              {dealer.businessName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/dealers/${dealer.id}`}
                                className="font-bold text-xs sm:text-sm text-foreground hover:text-primary hover:underline transition-colors block truncate"
                              >
                                {dealer.businessName}
                              </Link>
                              <p className="text-[10px] font-semibold text-muted-foreground">@{dealer.username}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden font-medium text-xs text-foreground lg:table-cell">
                          {dealer.ownerName ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="size-3 text-muted-foreground/70" />
                              {dealer.ownerName}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>

                        <TableCell className="hidden font-medium text-xs text-muted-foreground lg:table-cell">
                          {dealer.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3 text-muted-foreground/70" />
                              {dealer.phone}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>

                        <TableCell className="font-bold text-xs text-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="size-3 text-muted-foreground" />
                            {dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(dealer.creditLimit)}
                          </span>
                        </TableCell>

                        <TableCell className="font-black text-xs sm:text-sm">
                          {Number(dealer.outstandingBalance) < 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <span>{formatCurrency(Math.abs(Number(dealer.outstandingBalance)))}</span>
                              <span className="text-[10px] font-bold uppercase">Cr</span>
                            </span>
                          ) : Number(dealer.outstandingBalance) > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatCurrency(dealer.outstandingBalance)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{formatCurrency(0)}</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <AccountStatusBadge status={dealer.status} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(dealer)}
                              className="rounded-xl font-bold text-xs hover:bg-muted"
                            >
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
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((dealer) => (
                <div
                  key={dealer.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-xs shrink-0">
                        {dealer.businessName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/dealers/${dealer.id}`} className="font-bold text-xs text-foreground truncate block">
                          {dealer.businessName}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">@{dealer.username}</p>
                      </div>
                    </div>

                    <AccountStatusBadge status={dealer.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Outstanding</p>
                      <p className="font-black text-xs text-amber-600 dark:text-amber-400">
                        {formatCurrency(dealer.outstandingBalance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(dealer)} className="rounded-xl font-bold text-xs">
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
        <DialogContent title="Dealer Login Credentials" className="sm:max-w-md rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold">Dealer Login Credentials</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide these initial credentials to the dealer. The password cannot be retrieved again after closing.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-3 my-2">
              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Username</p>
                <p className="font-mono font-extrabold text-sm text-foreground mt-0.5">{credentials.username}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporary Password</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="font-mono font-extrabold text-sm text-primary">{credentials.temporaryPassword}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.temporaryPassword);
                      toast.success('Copied to clipboard');
                    }}
                    className="size-8 rounded-xl hover:bg-muted"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCredentials(null)} className="w-full rounded-2xl font-bold">
              Done &amp; Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDealer} onOpenChange={(open) => !open && setDeletingDealer(null)}>
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60 select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Delete this dealer account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This permanently deletes {deletingDealer?.businessName}&apos;s account. This is only permitted if the dealer has zero orders, invoices, or payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete Dealer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
