'use client';

import { useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { QueryErrorState } from '@/components/query-error-state';
import { ProductCard } from '@/components/dealer/product-card';
import { useProducts } from '@/hooks/use-products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
];

export default function DealerProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: 'ACTIVE',
  });

  const sortedData = useMemo(() => {
    if (!data) return [];
    const [field, dir] = sort.split('-');
    const copy = [...data.data];
    copy.sort((a, b) => {
      const cmp =
        field === 'price'
          ? Number(a.wholesalePrice) - Number(b.wholesalePrice)
          : a.name.localeCompare(b.name);
      return dir === 'desc' ? -cmp : cmp;
    });
    return copy;
  }, [data, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">Browse available products and add to cart</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? 'No matching products' : 'No products found'}
          description={search ? 'Try a different search term' : 'Check back later for new products'}
        />
      ) : (
        <>
          <div
            className={cn(
              'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
              isFetching && 'opacity-60 transition-opacity',
            )}
          >
            {sortedData.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
