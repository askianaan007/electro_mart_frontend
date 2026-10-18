import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Placeholder rows for a list/table while its first page loads. */
export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5 p-4 sm:p-5', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" style={{ opacity: 1 - i * (0.6 / rows) }} />
      ))}
    </div>
  );
}

/** Placeholder for a full page (detail pages, dashboards) while it loads. */
export function PageSkeleton({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)} aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
