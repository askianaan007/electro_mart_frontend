import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Header row inside a card/panel: title, background-refresh spinner, optional actions. */
export function SectionHeader({
  title,
  description,
  isFetching = false,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  isFetching?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {isFetching && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Refreshing" />
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
