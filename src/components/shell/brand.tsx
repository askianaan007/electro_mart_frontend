import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Logo + wordmark. With `subtitle` it renders the sidebar version: larger
 * logo tile and the console name as a small badge. `href` makes it a home link.
 */
export function Brand({
  subtitle,
  href,
  className,
}: {
  subtitle?: string;
  href?: string;
  className?: string;
}) {
  const large = Boolean(subtitle);
  const SubtitleIcon = subtitle?.toLowerCase().includes('dealer') ? Store : ShieldCheck;

  const content = (
    <>
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center bg-white ring-1 ring-black/[0.06] transition-transform duration-200 group-hover/brand:scale-[1.04] dark:ring-white/10',
          large
            ? 'size-10 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,28,74,0.25)]'
            : 'size-8 rounded-lg shadow-xs',
        )}
      >
        <Image
          src="/logo-icon-transparent.png"
          alt=""
          width={417}
          height={410}
          className={large ? 'size-[26px]' : 'size-[22px]'}
          priority
        />
      </div>
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'truncate font-bold tracking-tight text-foreground',
            large ? 'text-[15px]' : 'text-sm font-semibold',
          )}
        >
          Electro <span className="text-brand-red">Mart</span>
        </p>
        {subtitle && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <SubtitleIcon className="size-3" />
            {subtitle}
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Electro Mart — go to dashboard"
        className={cn(
          'group/brand -m-1.5 flex min-w-0 items-center gap-3 rounded-xl p-1.5 outline-none transition-colors hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring/30',
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={cn('flex min-w-0 items-center gap-2.5', large && 'gap-3', className)}>{content}</div>;
}
