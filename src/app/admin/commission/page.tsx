'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, HandCoins, Plus, Receipt, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { PaginationBar } from '@/components/pagination-bar';
import { SettlementStatusBadge } from '@/components/status-badge';
import { StatCard } from '@/components/stat-card';
import { FilterBar } from '@/components/filter-bar';
import { SectionHeader } from '@/components/section-header';
import { CreateSettlementDialog } from '@/components/admin/create-settlement-dialog';
import { useCommissionDashboard, useSettlements } from '@/hooks/use-commission';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SettlementStatus } from '@/lib/api/types';

export default function CommissionPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const debouncedSearch = useDebouncedValue(search);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = useCommissionDashboard();
  const { data, isLoading, isFetching, isError, error, refetch } = useSettlements({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : (status as SettlementStatus),
  });

  const filtersActive = !!search || status !== 'all';

  function clearFilters() {
    setSearch('');
    setStatus('all');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Commission</h1>
          <p className="text-sm text-muted-foreground">Track and settle representative commission</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Create Settlement
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending Commission"
          value={dashboardLoading ? '…' : formatCurrency(dashboard?.pendingCommission ?? 0)}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Approved Commission"
          value={dashboardLoading ? '…' : formatCurrency(dashboard?.approvedCommission ?? 0)}
          icon={HandCoins}
        />
        <StatCard
          label="Settled Commission"
          value={dashboardLoading ? '…' : formatCurrency(dashboard?.settledCommission ?? 0)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Pending Settlements"
          value={dashboardLoading ? '…' : (dashboard?.pendingSettlementsCount ?? 0)}
          icon={Receipt}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <SectionHeader title="Settlements" isFetching={isFetching && !isLoading} />
        <FilterBar>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search settlement number..."
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
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
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
          <EmptyState
            icon={Receipt}
            title="No settlements found"
            description="Create a settlement to batch a representative's pending commission for payout"
          />
        ) : (
          <>
            <div className={cn(isFetching && 'opacity-60 transition-opacity')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Settlement #</TableHead>
                    <TableHead>Representative</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <Link href={`/admin/commission/settlements/${settlement.id}`} className="font-medium text-primary">
                          {settlement.settlementNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{settlement.representative?.name ?? '—'}</TableCell>
                      <TableCell>
                        {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
                      </TableCell>
                      <TableCell>{formatCurrency(settlement.totalCommission)}</TableCell>
                      <TableCell>
                        <SettlementStatusBadge status={settlement.status} />
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

      <CreateSettlementDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
