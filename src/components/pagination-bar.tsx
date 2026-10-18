import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/lib/api/types';

export function PaginationBar({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row sm:px-5">
      <p className="text-[13px] text-muted-foreground tabular-nums">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{meta.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-[13px] text-muted-foreground tabular-nums sm:inline">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
