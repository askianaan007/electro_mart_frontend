'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, MoreHorizontal, Package, Plus, Search, Tags, Trash2 } from 'lucide-react';
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
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
import { CategoryManagerDialog } from '@/components/admin/category-manager-dialog';
import { useDeleteProduct, useProducts, useSetProductStatus } from '@/hooks/use-products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

function ProductRowActions({ product, onDeleteRequest }: { product: Product; onDeleteRequest: () => void }) {
  const setStatus = useSetProductStatus();

  function toggleStatus() {
    const next = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatus.mutate(
      { id: product.id, status: next },
      {
        onSuccess: () => toast.success(`Product ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={toggleStatus}>
          {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const deleteProduct = useDeleteProduct();

  const { data, isLoading } = useProducts({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    outOfStockOnly: outOfStockOnly || undefined,
  });

  function openCreate() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingProduct) return;
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => {
        toast.success('Product deleted');
        setDeletingProduct(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingProduct(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Tags />
            Categories
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, code, SKU, brand..."
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
        <Button
          variant={outOfStockOnly ? 'default' : 'outline'}
          onClick={() => {
            setOutOfStockOnly((v) => !v);
            setPage(1);
          }}
        >
          <AlertTriangle />
          Out of stock only
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Package} title="No products found" description="Add your first product to get started" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Wholesale Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <button
                        onClick={() => openEdit(product)}
                        className="flex items-center gap-3 text-left"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} width={36} height={36} className="object-cover" />
                          ) : (
                            <Package className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{product.productCode}</p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{product.category ?? '—'}</TableCell>
                    <TableCell>{formatCurrency(product.wholesalePrice)}</TableCell>
                    <TableCell>
                      <span className={product.isOutOfStock ? 'font-medium text-destructive' : ''}>
                        {product.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={product.status} />
                    </TableCell>
                    <TableCell>
                      <ProductRowActions product={product} onDeleteRequest={() => setDeletingProduct(product)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <CategoryManagerDialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingProduct?.name}&quot; will be permanently removed. This only works if it has no order
              or purchase history — otherwise deactivate it instead.
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
