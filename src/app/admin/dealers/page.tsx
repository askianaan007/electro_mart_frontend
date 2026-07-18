'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, MoreHorizontal, Plus, Search, Trash2, Users } from 'lucide-react';
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
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/dealers/${dealer.id}`}>View profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetPassword.isPending}>
          Reset password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleStatus} disabled={setStatus.isPending}>
          {dealer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Trash2 />
          Delete
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Customer</h1>
          <p className="text-sm text-muted-foreground">Manage dealer accounts and credit terms</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add Dealer
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="All customer" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, username..."
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
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </FilterBar>

        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching dealers"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Users} title="No dealers found" description="Add your first dealer to get started" />
          )
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <Link href={`/admin/dealers/${dealer.id}`} className="font-medium text-primary">
                          {dealer.businessName}
                        </Link>
                        <p className="text-xs text-muted-foreground">@{dealer.username}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{dealer.ownerName}</TableCell>
                      <TableCell className="hidden lg:table-cell">{dealer.phone}</TableCell>
                      <TableCell>{dealer.unlimitedCredit ? 'Unlimited' : formatCurrency(dealer.creditLimit)}</TableCell>
                      <TableCell>
                        {Number(dealer.outstandingBalance) < 0 ? (
                          <span className="text-success">
                            {formatCurrency(Math.abs(Number(dealer.outstandingBalance)))} Cr
                          </span>
                        ) : (
                          formatCurrency(dealer.outstandingBalance)
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountStatusBadge status={dealer.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(dealer)}>
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

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent title="Dealer credentials">
          <DialogHeader>
            <DialogTitle>Dealer credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the dealer. This password will not be shown again.
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

      <AlertDialog open={!!deletingDealer} onOpenChange={(open) => !open && setDeletingDealer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dealer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deletingDealer?.businessName}&apos;s account. This only works if the dealer
              has no orders, invoices, payments, or return records — otherwise deactivate the account instead.
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
