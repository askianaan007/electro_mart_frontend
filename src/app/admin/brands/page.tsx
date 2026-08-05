'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { AccountStatusBadge } from '@/components/status-badge';
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
import { BrandFormDialog } from '@/components/admin/brand-form-dialog';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { useBrands, useDeleteBrand } from '@/hooks/use-brands';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Brand } from '@/lib/api/types';

export default function BrandsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>(undefined);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const deleteBrand = useDeleteBrand();

  const { data, isLoading, isFetching, isError, error, refetch } = useBrands({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  function openCreate() {
    setEditingBrand(undefined);
    setFormOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditingBrand(brand);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingBrand) return;
    deleteBrand.mutate(deletingBrand.id, {
      onSuccess: () => {
        toast.success('Brand deleted');
        setDeletingBrand(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingBrand(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">
            Manage brand pages and logos for the Representative Portal storefront
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Add Brand
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="All brands" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
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
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Tag} title="No brands found" description="Add your first brand to get started" />
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        <button onClick={() => openEdit(brand)} className="flex items-center gap-3 text-left">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                            {brand.logoUrl ? (
                              <Image src={brand.logoUrl} alt={brand.name} width={36} height={36} className="object-cover" />
                            ) : (
                              <Tag className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="font-medium text-primary">{brand.name}</p>
                        </button>
                      </TableCell>
                      <TableCell>{brand.sortOrder}</TableCell>
                      <TableCell>{brand.isFeatured ? <Badge variant="purple">Featured</Badge> : '—'}</TableCell>
                      <TableCell>
                        <AccountStatusBadge status={brand.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(brand)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletingBrand(brand)}>
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
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <BrandFormDialog
        key={formOpen ? (editingBrand?.id ?? 'new') : 'closed'}
        open={formOpen}
        onOpenChange={setFormOpen}
        brand={editingBrand}
      />

      <AlertDialog open={!!deletingBrand} onOpenChange={(open) => !open && setDeletingBrand(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this brand?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingBrand?.name}&quot; will be permanently removed. This only works if no products
              reference it — otherwise deactivate it instead.
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
