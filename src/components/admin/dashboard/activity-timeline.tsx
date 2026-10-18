'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  HandCoins,
  Package,
  Package2,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { SectionHeader } from '@/components/section-header';
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

function TimelineSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline({
  items,
  isLoading = false,
  isFetching = false,
  isError = false,
  error,
  onRetry,
}: {
  items: ActivityLog[];
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <SectionHeader
        title="Recent Audit Trail"
        description="System audit trail & admin operations"
        isFetching={isFetching && !isLoading}
        className="pb-4"
        actions={
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
            <Link href="/admin/activity-log">
              View all
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <TimelineSkeleton />
      ) : isError ? (
        <QueryErrorState error={error} onRetry={onRetry} />
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No activity recorded yet" description="System audit actions will appear here" />
      ) : (
        <ul className="px-4 pb-4 sm:px-5 sm:pb-5">
          {items.map((log, index) => {
            const Icon = iconFor(log.action);
            const tone = toneFor(log.action);
            const isLast = index === items.length - 1;
            return (
              <li key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast && <span aria-hidden className="absolute bottom-0 left-4 top-9 w-px bg-border" />}
                <div className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
                  <p className="break-words text-sm font-medium leading-snug text-foreground">{describe(log)}</p>
                  {log.details && <p className="break-words text-xs text-muted-foreground">{log.details}</p>}
                  <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(log.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
