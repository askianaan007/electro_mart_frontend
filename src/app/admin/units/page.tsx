'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Barcode, Boxes, ScanLine, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { PageHeader } from '@/components/page-header';
import { PaginationBar } from '@/components/pagination-bar';
import { QueryErrorState } from '@/components/query-error-state';
import { SectionHeader } from '@/components/section-header';
import { TableSkeleton } from '@/components/loading-state';
import { RegisterSerialsDialog } from '@/components/scan/register-serials-dialog';
import { UnitStatusBadge } from '@/components/scan/unit-status-badge';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useProductUnits, useSerialCoverage } from '@/hooks/use-product-units';
import type { ProductUnitCondition, ProductUnitListRow, ProductUnitStatus, SerialCoverageRow } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

export default function SerialUnitsPage() {
  const [tab, setTab] = useState('units');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Serial units"
        description="Every serial-tracked unit, where it is now, and which stock still has no serial."
        actions={
          <Button asChild>
            <Link href="/admin/scan">
              <ScanLine />
              Scan
            </Link>
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="units">
            <Barcode /> Units
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <Boxes /> Coverage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="units" className="mt-4">
          <UnitsTab />
        </TabsContent>
        <TabsContent value="coverage" className="mt-4">
          <CoverageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UnitsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [condition, setCondition] = useState('all');
  const debouncedSearch = useDebouncedValue(search);
  const filtersActive = !!search || status !== 'all' || condition !== 'all';

  const { data, dataUpdatedAt, isLoading, isFetching, isError, error, refetch } = useProductUnits({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : (status as ProductUnitStatus),
    condition: condition === 'all' ? undefined : (condition as ProductUnitCondition),
  });

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setCondition('all');
    setPage(1);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader title="Units" isFetching={isFetching && !isLoading} className="pb-3" />
      <FilterBar>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Serial or product name…"
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
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="IN_STOCK">In stock</SelectItem>
            <SelectItem value="ALLOCATED">Allocated</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="RETURNED_TO_SUPPLIER">With supplier</SelectItem>
            <SelectItem value="WRITTEN_OFF">Written off</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={condition}
          onValueChange={(v) => {
            setCondition(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any condition</SelectItem>
            <SelectItem value="GOOD">Good</SelectItem>
            <SelectItem value="DEFECTIVE">Defective</SelectItem>
          </SelectContent>
        </Select>
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
        <EmptyState
          icon={Barcode}
          title={filtersActive ? 'No matching units' : 'No serials registered yet'}
          description={
            filtersActive
              ? 'Try adjusting or clearing your filters'
              : 'Turn on "Track serial numbers" for a product, then scan serials when goods arrive.'
          }
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">Serial</TableHead>
                  <TableHead className="w-[28%]">Product</TableHead>
                  <TableHead className="w-[13%]">Status</TableHead>
                  <TableHead className="w-[17%]">Order / customer</TableHead>
                  <TableHead className="w-[10%]">Purchase</TableHead>
                  <TableHead className="w-[10%]">Warranty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <Link
                        href={`/admin/units/${unit.id}`}
                        title={unit.serialNumber}
                        className="block truncate font-mono font-medium text-primary hover:underline"
                      >
                        {unit.serialNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">Received {formatDate(unit.receivedAt)}</p>
                    </TableCell>
                    <TableCell>
                      <ProductCell product={unit.product} />
                    </TableCell>
                    <TableCell>
                      <UnitStatusBadge status={unit.status} condition={unit.condition} />
                    </TableCell>
                    <TableCell>
                      {unit.order ? (
                        <Link href={`/admin/orders/${unit.order.id}`} className="group block min-w-0">
                          <span className="block truncate font-mono text-xs text-foreground group-hover:text-primary group-hover:underline">
                            {unit.order.orderNumber}
                          </span>
                          <span
                            className="block truncate text-xs text-muted-foreground"
                            title={unit.order.dealer.businessName}
                          >
                            {unit.order.dealer.businessName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.purchase ? (
                        <Link
                          href={`/admin/purchases/${unit.purchase.id}`}
                          title={unit.purchase.invoiceNumber}
                          className="block truncate font-mono text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {unit.purchase.invoiceNumber}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {unit.source === 'REPLACEMENT' ? 'Replacement' : 'Existing stock'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <WarrantyCell expiresAt={unit.warrantyExpiresAt} now={dataUpdatedAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="divide-y divide-border border-t border-border lg:hidden">
            {data.data.map((unit) => (
              <li key={unit.id}>
                <Link href={`/admin/units/${unit.id}`} className="block space-y-1.5 px-4 py-3 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-all font-mono text-sm font-medium text-foreground">
                      {unit.serialNumber}
                    </span>
                    <UnitStatusBadge status={unit.status} condition={unit.condition} />
                  </div>
                  <ProductCell product={unit.product} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {unit.order && (
                      <span className="min-w-0 truncate">
                        <span className="font-mono">{unit.order.orderNumber}</span> · {unit.order.dealer.businessName}
                      </span>
                    )}
                    {unit.warrantyExpiresAt && (
                      <WarrantyCell expiresAt={unit.warrantyExpiresAt} now={dataUpdatedAt} inline />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <PaginationBar meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CoverageTab() {
  const { data, isLoading, isError, error, refetch } = useSerialCoverage();
  const [registering, setRegistering] = useState<SerialCoverageRow | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title="Coverage per tracked product"
        description="Units physically here (in stock + reserved for orders) against units carrying a serial."
        className="pb-3"
      />
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No tracked products"
          description='Turn on "Track serial numbers" in a product to start.'
        />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {data.map((row) => {
            const covered = row.held > 0 ? Math.min(100, Math.round((row.serialsHeld / row.held) * 100)) : 100;
            return (
              <li key={row.id} className="space-y-3 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground" title={row.name}>
                        {row.name}
                      </p>
                      {!row.trackSerials && <Badge variant="muted">Tracking off</Badge>}
                      {row.problem && (
                        <Badge variant="destructive">
                          <AlertTriangle /> More serials than units
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground tabular-nums">{row.serialsHeld}</span> of{' '}
                      <span className="tabular-nums">{row.held}</span> units here ({row.currentStock} in stock +{' '}
                      {row.reserved} reserved) have a serial
                      {row.gap > 0 && (
                        <span className="text-warning-foreground dark:text-warning"> · {row.gap} without serial</span>
                      )}
                    </p>
                  </div>
                  {row.gap > 0 && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => setRegistering(row)}>
                      <ScanLine />
                      Register existing stock
                    </Button>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={row.gap > 0 ? 'h-full bg-warning' : 'h-full bg-success'}
                    style={{ width: `${covered}%` }}
                  />
                </div>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Stat
                    label="In stock"
                    value={row.inStock}
                    note={row.defectiveInStock > 0 ? `${row.defectiveInStock} defective` : undefined}
                  />
                  <Stat label="Allocated" value={row.allocated} />
                  <Stat label="Sold" value={row.sold} />
                  <Stat label="With supplier" value={row.returnedToSupplier} />
                  <Stat label="Written off" value={row.writtenOff} />
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      {registering && (
        <RegisterSerialsDialog
          open={!!registering}
          onOpenChange={(open) => !open && setRegistering(null)}
          productId={registering.id}
          productName={registering.name}
          max={registering.gap}
        />
      )}
    </div>
  );
}

function ProductCell({ product }: { product: ProductUnitListRow['product'] }) {
  const meta = [product.brand, product.model].filter(Boolean).join(' · ');
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground" title={product.name}>
        {product.name}
      </p>
      <p
        className="truncate text-xs text-muted-foreground"
        title={[meta, product.productCode].filter(Boolean).join(' · ')}
      >
        {meta && <span>{meta} · </span>}
        <span className="font-mono">{product.productCode}</span>
      </p>
    </div>
  );
}

// `now` is when the list was fetched, so days-left stays stable across re-renders.
function WarrantyCell({ expiresAt, now, inline }: { expiresAt: string | null; now: number; inline?: boolean }) {
  if (!expiresAt) return <span className="text-muted-foreground">—</span>;
  const days = Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000);
  const hint = days < 0 ? 'Expired' : days <= 30 ? `${days}d left` : null;
  const tone =
    days < 0 ? 'text-destructive' : days <= 30 ? 'text-warning-foreground dark:text-warning' : 'text-muted-foreground';
  if (inline) {
    return (
      <span className={tone}>
        Warranty {formatDate(expiresAt)}
        {hint && ` (${hint})`}
      </span>
    );
  }
  return (
    <div className="text-xs">
      <p className="text-foreground">{formatDate(expiresAt)}</p>
      {hint && <p className={tone}>{hint}</p>}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
      <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">
        {value}
        {note && <span className="ml-1 text-[11px] font-normal text-warning-foreground dark:text-warning">{note}</span>}
      </dd>
    </div>
  );
}
