import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-14 text-center', className)}>
      <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-xs">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
