import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Brand({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white shadow-xs">
        <Image src="/logo-icon-transparent.png" alt="" width={417} height={410} className="size-[22px]" priority />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          Electro <span className="text-brand-red">Mart</span>
        </p>
        {subtitle && <p className="truncate text-[11px] font-medium text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
