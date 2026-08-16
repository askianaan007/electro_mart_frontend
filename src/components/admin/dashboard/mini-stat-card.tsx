import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: { chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', bg: 'from-blue-500/5' },
  success: { chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', bg: 'from-emerald-500/5' },
  warning: { chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', bg: 'from-amber-500/5' },
  destructive: { chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', bar: 'bg-rose-500', bg: 'from-rose-500/5' },
  purple: { chip: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', bar: 'bg-purple-500', bg: 'from-purple-500/5' },
} as const;

export function MiniStatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  changeLabel,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  change?: number | null;
  changeLabel?: string;
  href?: string;
}) {
  const t = TONES[tone];

  const content = (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br via-card to-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md sm:p-5",
      t.bg
    )}>
      <span className={cn('absolute inset-y-0 left-0 w-1 rounded-r-full', t.bar)} />
      <div className="flex items-start gap-3.5 pl-1.5">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner transition-transform duration-300 group-hover:scale-105', t.chip)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-xl font-bold leading-tight text-foreground sm:text-2xl">{value}</p>
          {typeof change === 'number' && (
            <p className={cn('mt-1 text-xs font-semibold inline-flex items-center gap-1', change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              <span>{change >= 0 ? '↑' : '↓'}</span>
              <span>{change >= 0 ? '+' : ''}{change.toFixed(0)}%{changeLabel ? ` ${changeLabel}` : ''}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
