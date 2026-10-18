'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, Layers, MoreHorizontal, Package, Plus, Search, Tags, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
import { CategoryManagerDialog } from '@/components/admin/category-manager-dialog';
import { ProductAvailabilityOverrideDialog } from '@/components/admin/product-availability-override-dialog';
import { ProductCommissionRulesDialog } from '@/components/admin/product-commission-rules-dialog';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/loading-state';
import { useDeleteProduct, useProducts, useSetProductStatus } from '@/hooks/use-products';
import { useAllCategories } from '@/hooks/use-categories';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

function ProductRowActions({
  product,
  onDeleteRequest,
  onAvailabilityOverride,
  onCommissionRules,
}: {
  product: Product;
  onDeleteRequest: () => void;
  onAvailabilityOverride: () => void;
  onCommissionRules: () => void;
}) {
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
        <Button variant="ghost" size="icon" className="size-8" aria-label="Product actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={toggleStatus}>
          {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAvailabilityOverride}>
          Rep availability override
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCommissionRules}>
          Commission rules
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
          <Trash2 className="size-4" />
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
  const [category, setCategory] = useState('all');
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [availabilityOverrideProduct, setAvailabilityOverrideProduct] = useState<Product | null>(null);
  const [commissionRulesProduct, setCommissionRulesProduct] = useState<Product | null>(null);

  const deleteProduct = useDeleteProduct();
  const { data: categories } = useAllCategories();

  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
    outOfStockOnly: outOfStockOnly || undefined,
  });

  const filtersActive = !!search || status !== 'all' || category !== 'all' || outOfStockOnly;

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setOutOfStockOnly(false);
    setPage(1);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingProduct(undefined);
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

  // Summary counts for top KPI cards
  const totalProducts = data?.meta?.total ?? 0;
  const activeProducts = data?.data.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const outOfStockCount = data?.data.filter((p) => p.isOutOfStock).length ?? 0;
  const totalCategories = categories?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage product listings, categories, pricing, stock levels, and commission rules."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
              <Tags />
              Categories
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              Add Product
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Catalog SKUs" value={isLoading ? '—' : totalProducts} icon={Layers} tone="info" />
        <StatCard label="Active Listings" value={isLoading ? '—' : activeProducts} icon={CheckCircle2} tone="success" />
        <StatCard
          label="Out of Stock Alert"
          value={isLoading ? '—' : outOfStockCount}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard label="Product Categories" value={totalCategories} icon={Tags} tone="purple" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <SectionHeader title="All Catalog Products" isFetching={isFetching && !isLoading} className="pb-3" />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, code..."
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
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent searchable searchPlaceholder="Search categories…">
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.data.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={outOfStockOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setOutOfStockOnly((v) => !v);
              setPage(1);
            }}
          >
            <AlertTriangle />
            Out of Stock
          </Button>

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
              title="No matching products"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Package} title="No products found" description="Products added to catalog will display here" />
          )
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={cn('hidden sm:block', isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="text-right">Wholesale Price</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <button onClick={() => openEdit(product)} className="group flex items-center gap-3 text-left">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="object-cover" />
                            ) : (
                              <Package className="size-[18px] text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                              {product.name}
                            </p>
                            {product.productCode && (
                              <div className="font-mono text-xs text-muted-foreground">SKU: {product.productCode}</div>
                            )}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {product.category ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(product.wholesalePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.isOutOfStock ? (
                          <Badge variant="destructive" className="tabular-nums">
                            {product.currentStock} units
                          </Badge>
                        ) : (
                          <span className="font-medium tabular-nums">
                            {product.currentStock}{' '}
                            <span className="text-xs font-normal text-muted-foreground">units</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountStatusBadge status={product.status} />
                      </TableCell>
                      <TableCell>
                        <ProductRowActions
                          product={product}
                          onDeleteRequest={() => setDeletingProduct(product)}
                          onAvailabilityOverride={() => setAvailabilityOverrideProduct(product)}
                          onCommissionRules={() => setCommissionRulesProduct(product)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((product) => (
                <div key={product.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => openEdit(product)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="object-cover" />
                        ) : (
                          <Package className="size-[18px] text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                        {product.productCode && (
                          <p className="font-mono text-xs text-muted-foreground">SKU: {product.productCode}</p>
                        )}
                      </div>
                    </button>
                    <AccountStatusBadge status={product.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-sm font-medium tabular-nums">{formatCurrency(product.wholesalePrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <span
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          product.isOutOfStock ? 'text-destructive' : 'text-foreground',
                        )}
                      >
                        {product.currentStock} units
                      </span>
                    </div>
                    <ProductRowActions
                      product={product}
                      onDeleteRequest={() => setDeletingProduct(product)}
                      onAvailabilityOverride={() => setAvailabilityOverrideProduct(product)}
                      onCommissionRules={() => setCommissionRulesProduct(product)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editingProduct} />
      <CategoryManagerDialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
      <ProductAvailabilityOverrideDialog
        open={!!availabilityOverrideProduct}
        onOpenChange={(open) => !open && setAvailabilityOverrideProduct(null)}
        product={availabilityOverrideProduct}
      />
      <ProductCommissionRulesDialog
        open={!!commissionRulesProduct}
        onOpenChange={(open) => !open && setCommissionRulesProduct(null)}
        product={commissionRulesProduct}
      />

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
            <AlertDialogAction
              onClick={confirmDelete}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
