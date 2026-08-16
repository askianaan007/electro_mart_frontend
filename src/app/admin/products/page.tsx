'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Boxes, CheckCircle2, Layers, MoreHorizontal, Package, Plus, Search, Tags, Trash2, X } from 'lucide-react';
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
        <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-muted">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl shadow-xl border-border/60">
        <DropdownMenuItem onClick={toggleStatus} className="font-semibold">
          {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAvailabilityOverride} className="font-medium">
          Rep availability override
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCommissionRules} className="font-medium">
          Commission rules
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDeleteRequest} className="font-bold">
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
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Package className="size-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Product Catalog
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium sm:text-sm">
            Manage product listings, categories, pricing, stock levels, and commission rules
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setCategoryManagerOpen(true)}
            className="rounded-2xl font-semibold backdrop-blur-md"
          >
            <Tags className="size-4" />
            <span>Categories</span>
          </Button>
          <Button onClick={openCreate} className="rounded-2xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus className="size-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* 4 Quick Product KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total SKUs */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Catalog SKUs
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {isLoading ? <Skeleton className="h-8 w-16" /> : totalProducts}
          </div>
        </div>

        {/* KPI 2: Active Products */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Active Listings
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : activeProducts}
          </div>
        </div>

        {/* KPI 3: Out of Stock */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Out of Stock Alert
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {isLoading ? <Skeleton className="h-8 w-16" /> : outOfStockCount}
          </div>
        </div>

        {/* KPI 4: Categories */}
        <div className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card/80 dark:bg-slate-900/60 p-4 backdrop-blur-xl shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Product Categories
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Tags className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-foreground">
            {totalCategories}
          </div>
        </div>
      </div>

      {/* Main Glass Table Container */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all select-none">
        {/* Top Specular Glass Shimmer Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

        <SectionHeader title="All Catalog Products" isFetching={isFetching && !isLoading} />

        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl border-border/60 bg-background/60 backdrop-blur-md"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-36 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold">
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
            <SelectTrigger className="sm:w-40 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
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
            className="rounded-xl font-semibold"
          >
            <AlertTriangle className="size-3.5" />
            <span>Out of Stock</span>
          </Button>

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
              title="No matching products"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl font-semibold">
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
            <div className={cn('hidden sm:block overflow-x-auto p-4 sm:p-6', isFetching && 'opacity-60 transition-opacity')}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 backdrop-blur-md">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent border-border/60">
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Product
                      </TableHead>
                      <TableHead className="hidden font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground md:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Wholesale Price
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Current Stock
                      </TableHead>
                      <TableHead className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/50">
                    {data.data.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <button
                            onClick={() => openEdit(product)}
                            className="flex items-center gap-3 text-left group"
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/60 shadow-2xs group-hover:scale-105 transition-transform">
                              {product.imageUrl ? (
                                <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="object-cover" />
                              ) : (
                                <Package className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-foreground group-hover:text-primary transition-colors">
                                {product.name}
                              </p>
                              {product.productCode && (
                                <span className="mt-0.5 inline-block font-mono text-[10px] text-muted-foreground">
                                  SKU: {product.productCode}
                                </span>
                              )}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="hidden font-semibold text-xs text-muted-foreground md:table-cell">
                          {product.category ?? '—'}
                        </TableCell>
                        <TableCell className="font-extrabold text-foreground">
                          {formatCurrency(product.wholesalePrice)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-xl px-2.5 py-0.5 font-extrabold text-xs border',
                              product.isOutOfStock
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-muted/60 text-foreground border-border/50'
                            )}
                          >
                            {product.currentStock} units
                          </span>
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
            </div>

            {/* Mobile Cards View */}
            <div className={cn('space-y-3 p-4 sm:hidden', isFetching && 'opacity-60 transition-opacity')}>
              {data.data.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => openEdit(product)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/60">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="object-cover" />
                        ) : (
                          <Package className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground text-sm">{product.name}</p>
                        {product.productCode && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            SKU: {product.productCode}
                          </span>
                        )}
                      </div>
                    </button>
                    <AccountStatusBadge status={product.status} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price</p>
                      <p className="font-extrabold text-foreground text-sm">{formatCurrency(product.wholesalePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock</p>
                      <span className={cn('font-extrabold text-xs', product.isOutOfStock ? 'text-rose-500' : 'text-foreground')}>
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
        <AlertDialogContent className="rounded-3xl shadow-2xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold text-lg">Delete this product?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              &quot;{deletingProduct?.name}&quot; will be permanently removed. This only works if it has no order
              or purchase history — otherwise deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
