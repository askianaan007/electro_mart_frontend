import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  change,
  changeLabel,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'destructive' | 'success';
  hint?: string;
  /** Percentage change vs. the prior period, e.g. 22 renders as "+22%" */
  change?: number;
  /** Suffix shown after the change badge, e.g. "vs Last Month" */
  changeLabel?: string;
  /** When provided, renders a small "View All" link */
  href?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg',
            tone === 'default' && 'bg-primary/10 text-primary',
            tone === 'warning' && 'bg-warning/20 text-warning-foreground',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
            tone === 'success' && 'bg-success/15 text-success',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-medium text-muted-foreground">{label}</p>
          <p className="break-words text-xl font-semibold leading-tight">{value}</p>
          {typeof change === 'number' && (
            <p className={cn('break-words text-xs font-medium', change >= 0 ? 'text-success' : 'text-destructive')}>
              {change >= 0 ? '+' : ''}
              {change.toFixed(0)}%{changeLabel ? ` ${changeLabel}` : ''}
            </p>
          )}
          {hint && <p className="break-words text-xs text-muted-foreground">{hint}</p>}
          {href && (
            <Link href={href} className="mt-0.5 inline-block text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
