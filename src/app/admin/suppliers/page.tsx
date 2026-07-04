'use client';

import { useState } from 'react';
import { Factory, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
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
import type { Supplier } from '@/lib/api/types';

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const deleteSupplier = useDeleteSupplier();
  const { data, isLoading } = useSuppliers({ page, limit: 20, search: debouncedSearch || undefined });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers used for stock purchases</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add Supplier
        </Button>
      </div>

      <div className="relative max-w-xs">
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
          <EmptyState icon={Factory} title="No suppliers found" description="Add a supplier to start recording purchases" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{supplier.contact ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{supplier.phone ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.email ?? '—'}</TableCell>
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
