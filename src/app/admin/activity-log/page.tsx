'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Search, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useActivityLog, useActivityLogAdmins } from '@/hooks/use-activity-log';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime } from '@/lib/utils';
import type { ActivityLog } from '@/lib/api/types';

const ACTION_CATALOG: { module: string; actions: { value: string; label: string }[] }[] = [
  {
    module: 'Orders',
    actions: [
      { value: 'ADMIN_CREATED_ORDER', label: 'Created order for dealer' },
      { value: 'UPDATED_ORDER_ITEMS', label: 'Updated order items' },
      { value: 'DELETED_ORDER', label: 'Deleted order' },
      { value: 'APPROVED_ORDER', label: 'Approved order' },
      { value: 'REJECTED_ORDER', label: 'Rejected order' },
      { value: 'ORDER_PACKED', label: 'Marked order packed' },
      { value: 'ORDER_DELIVERED', label: 'Marked order delivered' },
      { value: 'ORDER_COMPLETED', label: 'Completed order' },
    ],
  },
  { module: 'Payments', actions: [{ value: 'RECORDED_PAYMENT', label: 'Recorded payment' }] },
  {
    module: 'Purchases',
    actions: [
      { value: 'RECORDED_PURCHASE', label: 'Recorded purchase' },
      { value: 'UPDATED_PURCHASE', label: 'Updated purchase' },
      { value: 'DELETED_PURCHASE', label: 'Deleted purchase' },
    ],
  },
  { module: 'Purchase Returns', actions: [{ value: 'RECORDED_PURCHASE_RETURN', label: 'Recorded purchase return' }] },
  { module: 'Sales Returns', actions: [{ value: 'RECORDED_SALES_RETURN', label: 'Recorded sales return' }] },
  {
    module: 'Supplier Credits',
    actions: [
      { value: 'RECORDED_SUPPLIER_SETTLEMENT', label: 'Recorded supplier settlement' },
      { value: 'UPDATED_CHEQUE_STATUS', label: 'Updated cheque status' },
      { value: 'DELETED_SUPPLIER_SETTLEMENT', label: 'Deleted supplier settlement' },
    ],
  },
  {
    module: 'Expenses',
    actions: [
      { value: 'RECORDED_EXPENSE', label: 'Recorded expense' },
      { value: 'UPDATED_EXPENSE', label: 'Updated expense' },
      { value: 'DELETED_EXPENSE', label: 'Deleted expense' },
    ],
  },
  {
    module: 'Investments',
    actions: [
      { value: 'RECORDED_INVESTMENT', label: 'Recorded investment' },
      { value: 'RECORDED_WITHDRAWAL', label: 'Recorded withdrawal' },
      { value: 'UPDATED_INVESTMENT', label: 'Updated investment' },
      { value: 'DELETED_INVESTMENT', label: 'Deleted investment' },
    ],
  },
  {
    module: 'Investors',
    actions: [
      { value: 'CREATED_INVESTOR', label: 'Created investor' },
      { value: 'UPDATED_INVESTOR', label: 'Updated investor' },
      { value: 'DELETED_INVESTOR', label: 'Deleted investor' },
    ],
  },
  {
    module: 'Customer',
    actions: [
      { value: 'CREATED_DEALER', label: 'Created dealer' },
      { value: 'UPDATED_DEALER', label: 'Updated dealer' },
      { value: 'DEALER_ACTIVE', label: 'Activated dealer' },
      { value: 'DEALER_INACTIVE', label: 'Deactivated dealer' },
    ],
  },
  {
    module: 'Suppliers',
    actions: [
      { value: 'CREATED_SUPPLIER', label: 'Created supplier' },
      { value: 'UPDATED_SUPPLIER', label: 'Updated supplier' },
      { value: 'DELETED_SUPPLIER', label: 'Deleted supplier' },
    ],
  },
  {
    module: 'Products',
    actions: [
      { value: 'CREATED_PRODUCT', label: 'Created product' },
      { value: 'UPDATED_PRODUCT', label: 'Updated product' },
      { value: 'PRODUCT_ACTIVE', label: 'Activated product' },
      { value: 'PRODUCT_INACTIVE', label: 'Deactivated product' },
      { value: 'DELETED_PRODUCT', label: 'Deleted product' },
    ],
  },
  {
    module: 'Categories',
    actions: [
      { value: 'CREATED_CATEGORY', label: 'Created category' },
      { value: 'UPDATED_CATEGORY', label: 'Updated category' },
      { value: 'DELETED_CATEGORY', label: 'Deleted category' },
    ],
  },
  { module: 'Inventory', actions: [{ value: 'ADJUSTED_INVENTORY', label: 'Adjusted inventory' }] },
];

const ACTION_LABELS = new Map(ACTION_CATALOG.flatMap((m) => m.actions).map((a) => [a.value, a.label]));

function actionLabel(action: string) {
  return ACTION_LABELS.get(action) ?? action.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function actionTone(action: string): 'success' | 'destructive' | 'warning' | 'muted' {
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('INACTIVE')) return 'destructive';
  if (action.includes('WITHDRAWAL')) return 'warning';
  if (
    action.includes('CREATED') ||
    action.includes('RECORDED') ||
    action.includes('APPROVED') ||
    action.includes('COMPLETED') ||
    action.endsWith('_ACTIVE')
  ) {
    return 'success';
  }
  return 'muted';
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge variant={actionTone(action)} className="whitespace-normal break-words text-left">
      {actionLabel(action)}
    </Badge>
  );
}

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const filtersActive =
    !!search || moduleFilter !== 'all' || actionFilter !== 'all' || adminFilter !== 'all' || !!dateFrom || !!dateTo;

  const actionsForModule = useMemo(
    () => ACTION_CATALOG.find((m) => m.module === moduleFilter)?.actions ?? [],
    [moduleFilter],
  );

  const actionParam =
    actionFilter !== 'all' ? actionFilter : moduleFilter !== 'all' ? actionsForModule.map((a) => a.value).join(',') : undefined;

  const { data: admins } = useActivityLogAdmins();
  const { data, isLoading } = useActivityLog({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    action: actionParam,
    adminId: adminFilter === 'all' ? undefined : adminFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  function handleModuleChange(value: string) {
    setModuleFilter(value);
    setActionFilter('all');
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setModuleFilter('all');
    setActionFilter('all');
    setAdminFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Activity Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Audit trail of every admin action.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[14rem]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search details or action..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={moduleFilter} onValueChange={handleModuleChange}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {ACTION_CATALOG.map((m) => (
                <SelectItem key={m.module} value={m.module}>
                  {m.module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={actionFilter}
            onValueChange={(value) => {
              setActionFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(moduleFilter === 'all' ? ACTION_CATALOG.flatMap((m) => m.actions) : actionsForModule).map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={adminFilter}
            onValueChange={(value) => {
              setAdminFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All admins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All admins</SelectItem>
              {admins?.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon={Search}
              title="No matching activity"
              description="Try adjusting or clearing your filters"
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={ClipboardList} title="No activity yet" description="Admin actions will appear here" />
          )
        ) : (
          <>
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words font-medium">{log.admin.name}</TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell className="whitespace-normal break-words text-muted-foreground">
                        {log.details ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 sm:hidden">
              {data.data.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full rounded-lg border border-border p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <ActionBadge action={log.action} />
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm">{log.details ?? '—'}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5" />
                    {log.admin.name}
                  </div>
                </button>
              ))}
            </div>

            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent title="Activity details">
          <DialogHeader>
            <DialogTitle>{selectedLog && actionLabel(selectedLog.action)}</DialogTitle>
            <DialogDescription>Full detail of this audit log entry.</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ActionBadge action={selectedLog.action} />
                <span className="text-xs text-muted-foreground">{formatDateTime(selectedLog.createdAt)}</span>
              </div>
              <Separator />
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Admin</p>
                  <p className="break-words">
                    {selectedLog.admin.name} <span className="text-muted-foreground">({selectedLog.admin.email})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Details</p>
                  <p className="whitespace-pre-wrap break-words">{selectedLog.details ?? '—'}</p>
                </div>
                {selectedLog.targetId && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Target ID</p>
                    <p className="break-all font-mono text-xs">{selectedLog.targetId}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
