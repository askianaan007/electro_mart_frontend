'use client';

import Link from 'next/link';
import {
  Activity,
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
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  destructive: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  primary: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
} as const;

function describe(log: ActivityLog): string {
  const action = log.action.replaceAll('_', ' ').toLowerCase();
  return `${log.admin.name} ${action}`;
}

export function ActivityTimeline({ items }: { items: ActivityLog[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/70 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-2xl select-none flex flex-col justify-between h-full">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-gradient-to-tr from-blue-500/10 to-transparent blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div>
        {/* Header Section */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="size-4.5 text-primary" />
              <h3 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                Recent Audit Trail
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              System audit trail &amp; admin operations
            </p>
          </div>

          <Button variant="ghost" size="sm" asChild className="rounded-full text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/10">
            <Link href="/admin/activity-log" className="flex items-center gap-1">
              <span>View all</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* Timeline Body */}
        {items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No activity recorded yet" description="System audit actions will appear here" />
        ) : (
          <ul className="relative z-10 mt-5 space-y-4">
            {items.map((log, index) => {
              const Icon = iconFor(log.action);
              const tone = toneFor(log.action);
              const isLast = index === items.length - 1;
              return (
                <li key={log.id} className="relative flex gap-3.5 pb-4 last:pb-0 group">
                  {!isLast && (
                    <span className="absolute left-4 top-8 h-[calc(100%-0.5rem)] w-0.5 bg-border/60 group-hover:bg-primary/40 transition-colors" />
                  )}
                  <div
                    className={cn(
                      'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-xl border ring-4 ring-card shadow-2xs transition-transform duration-300 group-hover:scale-110',
                      TONE_CLASSES[tone]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5 space-y-0.5">
                    <p className="break-words text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {describe(log)}
                    </p>
                    {log.details && (
                      <p className="break-words text-[11px] text-muted-foreground/90 leading-normal">
                        {log.details}
                      </p>
                    )}
                    <p className="text-[10px] font-semibold text-muted-foreground/70">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
