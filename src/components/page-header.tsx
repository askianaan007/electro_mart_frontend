import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const BACK_CLASS =
  '-ml-1 mb-1 inline-flex items-center gap-1 rounded-md px-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground';

/**
 * The one title block every page starts with: title, optional one-line
 * description, optional back link (detail pages) and right-aligned actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  onBack,
  backLabel = 'Back',
  meta,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  /** Use instead of backHref when Back should return to the previous page (router.back()). */
  onBack?: () => void;
  backLabel?: string;
  /** Small inline content next to the title, e.g. a status badge. */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    // Actions wrap below the title (instead of squeezing it) when they don't fit beside it.
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1 sm:flex-[1_1_20rem]">
        {onBack ? (
          <button type="button" onClick={onBack} className={BACK_CLASS}>
            <ChevronLeft className="size-4" />
            {backLabel}
          </button>
        ) : (
          backHref && (
            <Link href={backHref} className={BACK_CLASS}>
              <ChevronLeft className="size-4" />
              {backLabel}
            </Link>
          )
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {meta}
        </div>
        {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
