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

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
