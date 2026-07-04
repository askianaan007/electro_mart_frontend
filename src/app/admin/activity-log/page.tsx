'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { PaginationBar } from '@/components/pagination-bar';
import { useActivityLog } from '@/hooks/use-activity-log';
import { formatDateTime } from '@/lib/utils';

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useActivityLog({ page, limit: 25 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Audit trail of every admin action</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No activity yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden sm:table-cell">Details</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.admin.name}</TableCell>
                    <TableCell className="font-medium">{log.action.replaceAll('_', ' ')}</TableCell>
                    <TableCell className="hidden max-w-xs truncate sm:table-cell">{log.details ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
