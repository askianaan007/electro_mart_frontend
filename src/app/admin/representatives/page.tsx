'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, MoreHorizontal, Plus, Search, Trash2, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { RepresentativeStatusBadge } from '@/components/status-badge';
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
import { RepresentativeFormDialog } from '@/components/admin/representative-form-dialog';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import {
  useDeleteRepresentative,
  useResetRepresentativePassword,
  useRepresentatives,
  useSetRepresentativeStatus,
} from '@/hooks/use-representatives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Representative, RepresentativeStatus } from '@/lib/api/types';

function RepresentativeRowActions({
  representative,
  onPasswordReset,
  onDeleteRequest,
}: {
  representative: Representative;
  onPasswordReset: (credentials: { username: string; temporaryPassword: string }) => void;
  onDeleteRequest: () => void;
}) {
  const setStatus = useSetRepresentativeStatus(representative.id);
  const resetPassword = useResetRepresentativePassword();

  function setStatusTo(status: RepresentativeStatus) {
    setStatus.mutate(status, {
      onSuccess: () => toast.success(`Representative set to ${status.toLowerCase()}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleResetPassword() {
    resetPassword.mutate(representative.id, {
      onSuccess: (result) =>
        onPasswordReset({ username: representative.username, temporaryPassword: result.temporaryPassword }),
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
          <Link href={`/admin/representatives/${representative.id}`}>View profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetPassword.isPending}>
          Reset password
        </DropdownMenuItem>
        {representative.status !== 'ACTIVE' && (
          <DropdownMenuItem onClick={() => setStatusTo('ACTIVE')} disabled={setStatus.isPending}>
            Activate
          </DropdownMenuItem>
        )}
        {representative.status !== 'SUSPENDED' && (
          <DropdownMenuItem onClick={() => setStatusTo('SUSPENDED')} disabled={setStatus.isPending}>
            Suspend
          </DropdownMenuItem>
        )}
        {representative.status !== 'BLOCKED' && (
          <DropdownMenuItem onClick={() => setStatusTo('BLOCKED')} disabled={setStatus.isPending}>
            Block
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RepresentativesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | undefined>(undefined);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [deletingRep, setDeletingRep] = useState<Representative | null>(null);
  const deleteRep = useDeleteRepresentative();

  const { data, isLoading, isFetching, isError, error, refetch } = useRepresentatives({
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
    setEditingRep(undefined);
    setFormOpen(true);
  }

  function openEdit(rep: Representative) {
    setEditingRep(rep);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingRep) return;
    deleteRep.mutate(deletingRep.id, {
      onSuccess: () => {
        toast.success('Representative deleted');
        setDeletingRep(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingRep(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Representatives</h1>
          <p className="text-sm text-muted-foreground">
            Manage sales representative accounts for the Representative Portal
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add Representative
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="All representatives" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone..."
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
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
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
              title="No matching representatives"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={UserCog}
              title="No representatives found"
              description="Add your first representative to get started"
            />
          )
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell>
                        <Link href={`/admin/representatives/${rep.id}`} className="font-medium text-primary">
                          {rep.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{rep.email}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{rep.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(rep.joiningDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <RepresentativeStatusBadge status={rep.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rep)}>
                            Edit
                          </Button>
                          <RepresentativeRowActions
                            representative={rep}
                            onPasswordReset={setCredentials}
                            onDeleteRequest={() => setDeletingRep(rep)}
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

      <RepresentativeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        representative={editingRep}
        onCreated={setCredentials}
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

      <AlertDialog open={!!deletingRep} onOpenChange={(open) => !open && setDeletingRep(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this representative?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deletingRep?.name}&apos;s account. This only works if the representative has
              no customers, orders, or other related records — otherwise block the account instead.
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
