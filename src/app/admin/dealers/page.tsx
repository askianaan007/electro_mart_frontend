'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, MoreHorizontal, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DealerFormDialog } from '@/components/admin/dealer-form-dialog';
import { useDealers, useSetDealerStatus } from '@/hooks/use-dealers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Dealer } from '@/lib/api/types';

function DealerRowActions({ dealer }: { dealer: Dealer }) {
  const setStatus = useSetDealerStatus(dealer.id);

  function toggleStatus() {
    const next = dealer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatus.mutate(next, {
      onSuccess: () => toast.success(`Dealer ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`),
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
        <DropdownMenuItem onClick={toggleStatus}>
          {dealer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DealersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | undefined>(undefined);
  const [credentials, setCredentials] = useState<{ username: string; temporaryPassword: string } | null>(null);

  const { data, isLoading } = useDealers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
  });

  function openCreate() {
    setEditingDealer(undefined);
    setFormOpen(true);
  }

  function openEdit(dealer: Dealer) {
    setEditingDealer(dealer);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dealers</h1>
          <p className="text-sm text-muted-foreground">Manage dealer accounts and credit terms</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add Dealer
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Users} title="No dealers found" description="Add your first dealer to get started" />
        ) : (
          <>
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
                    <TableCell>{formatCurrency(dealer.creditLimit)}</TableCell>
                    <TableCell>{formatCurrency(dealer.outstandingBalance)}</TableCell>
                    <TableCell>
                      <AccountStatusBadge status={dealer.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(dealer)}>
                          Edit
                        </Button>
                        <DealerRowActions dealer={dealer} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <DialogTitle>Dealer account created</DialogTitle>
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
    </div>
  );
}
