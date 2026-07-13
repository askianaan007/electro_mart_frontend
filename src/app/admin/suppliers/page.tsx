'use client';

import { useState } from 'react';
import { Factory, Loader2, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
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

  const deleteSupplier = useDeleteSupplier();
  const { data, isLoading, isFetching } = useSuppliers({ page, limit: 20, search: debouncedSearch || undefined });

  function openCreate() {
    setEditingSupplier(undefined);
    setFormOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Factory className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Suppliers</h1>
              {isFetching && !isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Manage suppliers used for stock purchases</p>
          </div>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus />
          Add Supplier
        </Button>
      </div>

      <div className="relative sm:max-w-xs">
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

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
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
                      <TableCell className="whitespace-normal break-words">{supplier.phone ?? '—'}</TableCell>
                      <TableCell className="whitespace-normal break-words">{supplier.email ?? '—'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(supplier)}>Edit</DropdownMenuItem>
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
                <div key={supplier.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words font-medium">{supplier.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(supplier)}>Edit</DropdownMenuItem>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
