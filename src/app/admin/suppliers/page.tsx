'use client';

import { useState } from 'react';
import { Factory, FileText, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { PageHeader } from '@/components/page-header';
import { SectionHeader } from '@/components/section-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/loading-state';
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
import { SupplierFormDialog } from '@/components/admin/supplier-form-dialog';
import { SupplierStatementDialog } from '@/components/admin/supplier-statement-dialog';
import { useDeleteSupplier, useSuppliers } from '@/hooks/use-suppliers';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import { cn } from '@/lib/utils';
import type { Supplier } from '@/lib/api/types';

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);

  const deleteSupplier = useDeleteSupplier();
  const { data, isLoading, isFetching, isError, error, refetch } = useSuppliers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  function openCreate() {
    setEditingSupplier(undefined);
    setFormOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  function openStatement(supplier: Supplier) {
    setStatementSupplier(supplier);
    setStatementOpen(true);
  }

  function confirmDelete() {
    if (!deletingSupplier) return;
    deleteSupplier.mutate(deletingSupplier.id, {
      onSuccess: () => {
        toast.success('Supplier deleted');
        setDeletingSupplier(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingSupplier(null);
      },
    });
  }

  function clearFilters() {
    setSearch('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers used for stock purchases."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add Supplier
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="All suppliers" isFetching={isFetching && !isLoading} className="pb-3" />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        </FilterBar>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          search ? (
            <EmptyState
              icon={Search}
              title="No matching suppliers"
              description="Try a different search term"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Factory} title="No suppliers found" description="Add a supplier to start recording purchases" />
          )
        ) : (
          <>
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="whitespace-normal break-words font-medium">{supplier.name}</TableCell>
                      <TableCell className="whitespace-normal break-words">{supplier.contact ?? '—'}</TableCell>
                      <TableCell className="whitespace-normal break-words tabular-nums text-muted-foreground">
                        {supplier.phone ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {supplier.email ?? '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label="Supplier actions">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(supplier)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStatement(supplier)}>
                              <FileText />
                              Statement
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletingSupplier(supplier)}>
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((supplier) => (
                <div key={supplier.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words font-medium">{supplier.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 -mt-1 size-8 shrink-0"
                          aria-label="Supplier actions"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(supplier)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openStatement(supplier)}>
                          <FileText />
                          Statement
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeletingSupplier(supplier)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span>{supplier.contact ?? '—'}</span>
                    <span>{supplier.phone ?? '—'}</span>
                    <span className="break-words">{supplier.email ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editingSupplier} />
      <SupplierStatementDialog open={statementOpen} onOpenChange={setStatementOpen} supplier={statementSupplier} />

      <AlertDialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingSupplier?.name}&quot; will be permanently removed. This only works if it has no
              purchase history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteSupplier.isPending}
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
