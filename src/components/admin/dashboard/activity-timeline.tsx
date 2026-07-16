import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  HandCoins,
  Package,
  Package2,
  Truck,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { cn, formatDateTime } from '@/lib/utils';
import type { ActivityLog } from '@/lib/api/types';

function iconFor(action: string): LucideIcon {
  if (action.includes('RETURN')) return Undo2;
  if (action.includes('SETTLEMENT') || action.includes('CHEQUE')) return HandCoins;
  if (action.includes('PAYMENT')) return Wallet;
  if (action.includes('EXPENSE')) return CreditCard;
  if (action.includes('PURCHASE')) return Truck;
  if (action.includes('ORDER')) return Package2;
  if (action.includes('INVESTMENT') || action.includes('WITHDRAWAL')) return TrendingUp;
  if (action.includes('DEALER') || action.includes('SUPPLIER') || action.includes('INVESTOR')) return Users;
  if (action.includes('PRODUCT') || action.includes('CATEGORY') || action.includes('INVENTORY')) return Package;
  return ClipboardList;
}

function toneFor(action: string): 'success' | 'destructive' | 'purple' | 'primary' {
  if (action.includes('DELETED') || action.includes('REJECTED') || action.includes('INACTIVE')) return 'destructive';
  if (action.includes('SETTLEMENT') || action.includes('CHEQUE')) return 'purple';
  if (
    action.includes('APPROVED') ||
    action.includes('RECORDED') ||
    action.includes('CREATED') ||
    action.includes('COMPLETED') ||
    action.endsWith('_ACTIVE')
  ) {
    return 'success';
  }
  return 'primary';
}

const TONE_CLASSES = {
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  purple: 'bg-purple/10 text-purple',
  primary: 'bg-primary/10 text-primary',
} as const;

function describe(log: ActivityLog): string {
  const action = log.action.replaceAll('_', ' ').toLowerCase();
  return `${log.admin.name} ${action}`;
}

export function ActivityTimeline({ items }: { items: ActivityLog[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Recent Activity</p>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/activity-log">View all</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No activity yet" description="Admin actions will show up here" />
      ) : (
        <ul className="mt-4">
          {items.map((log, index) => {
            const Icon = iconFor(log.action);
            const tone = toneFor(log.action);
            const isLast = index === items.length - 1;
            return (
              <li key={log.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && <span className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px bg-border" />}
                <div
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                    TONE_CLASSES[tone],
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="break-words text-sm text-foreground">{describe(log)}</p>
                  {log.details && <p className="break-words text-xs text-muted-foreground">{log.details}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground/70">{formatDateTime(log.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
