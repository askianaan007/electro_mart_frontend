import { CheckCircle2, ClipboardList, Wallet, XCircle, Package2 } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { formatDateTime } from '@/lib/utils';
import type { ActivityLog } from '@/lib/api/types';

function iconFor(action: string) {
  if (action.startsWith('APPROVED')) return CheckCircle2;
  if (action.startsWith('REJECTED')) return XCircle;
  if (action.startsWith('RECORDED_PAYMENT')) return Wallet;
  if (action.startsWith('ORDER_')) return Package2;
  return ClipboardList;
}

function describe(log: ActivityLog): string {
  const action = log.action.replaceAll('_', ' ').toLowerCase();
  return `${log.admin.name} ${action}`;
}

export function RecentActivityFeed({ items }: { items: ActivityLog[] }) {
  if (items.length === 0) {
    return <EmptyState icon={ClipboardList} title="No activity yet" description="Admin actions will show up here" />;
  }

  return (
    <ul className="space-y-4">
      {items.map((log) => {
        const Icon = iconFor(log.action);
        return (
          <li key={log.id} className="flex gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{describe(log)}</p>
              {log.details && <p className="truncate text-xs text-muted-foreground">{log.details}</p>}
              <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
