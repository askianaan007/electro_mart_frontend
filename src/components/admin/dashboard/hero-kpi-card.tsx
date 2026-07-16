'use client';

import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const VARIANTS = {
  orange: {
    base: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 40%, #ea580c 68%, #fb923c 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(254,215,170,0.45), transparent 42%), radial-gradient(circle at 88% 85%, rgba(251,146,60,0.35), transparent 50%)',
    glow: 'shadow-[0_20px_55px_-18px_rgba(234,88,12,0.6)]',
    chip: 'from-amber-200 via-yellow-300 to-amber-500',
  },
  red: {
    base: 'linear-gradient(135deg, #450a0a 0%, #b91c1c 40%, #dc2626 68%, #f87171 100%)',
    mesh: 'radial-gradient(circle at 18% 15%, rgba(254,202,202,0.4), transparent 42%), radial-gradient(circle at 85% 82%, rgba(248,113,113,0.35), transparent 50%)',
    glow: 'shadow-[0_20px_55px_-18px_rgba(220,38,38,0.6)]',
    chip: 'from-amber-200 via-yellow-300 to-amber-500',
  },
  green: {
    base: 'linear-gradient(135deg, #033a2e 0%, #047857 40%, #10b981 70%, #2dd4bf 100%)',
    mesh: 'radial-gradient(circle at 16% 14%, rgba(167,243,208,0.4), transparent 42%), radial-gradient(circle at 86% 84%, rgba(45,212,191,0.35), transparent 50%)',
    glow: 'shadow-[0_20px_55px_-18px_rgba(16,185,129,0.6)]',
    chip: 'from-amber-200 via-yellow-300 to-amber-500',
  },
  blue: {
    base: 'linear-gradient(135deg, #0f2864 0%, #1d4ed8 42%, #2563eb 68%, #3b82f6 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(147,197,253,0.45), transparent 42%), radial-gradient(circle at 88% 85%, rgba(99,102,241,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_55px_-18px_rgba(37,99,235,0.6)]',
    chip: 'from-slate-100 via-white to-slate-300',
  },
} as const;

function ChipGlyph({ gradient }: { gradient: string }) {
  return (
    <div className={cn('relative flex h-6 w-8 items-center justify-center rounded-md bg-gradient-to-br shadow-inner', gradient)}>
      <div className="grid h-3.5 w-5 grid-cols-3 grid-rows-2 gap-[1.5px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[1px] bg-black/25" />
        ))}
      </div>
    </div>
  );
}

export function HeroKpiCard({
  label,
  value,
  formatValue = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  prefix,
  subtitle,
  icon: Icon,
  gradient,
  mask,
  progress,
}: {
  label: string;
  value: number;
  formatValue?: (n: number) => string;
  prefix?: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient: keyof typeof VARIANTS;
  mask?: string;
  progress?: { pct: number; label: string };
}) {
  const animated = useCountUp(value);
  const v = VARIANTS[gradient];

  return (
    <div
      className={cn(
        'group relative isolate flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[22px] border border-white/15 p-4 text-white transition-all duration-300 hover:-translate-y-1.5 sm:p-5',
        v.glow,
      )}
      style={{ backgroundImage: `${v.mesh}, ${v.base}` }}
    >
      {/* grain texture for a frosted, tactile card surface */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG }}
      />
      {/* glass sweep highlight */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-60" />
      <div className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[220%]" />
      {/* ambient glow orbs */}
      <div className="pointer-events-none absolute -right-10 -top-14 size-36 rounded-full bg-white/10 blur-3xl transition-transform duration-500 group-hover:scale-110" />
      <div className="pointer-events-none absolute -bottom-14 -left-8 size-32 rounded-full bg-black/10 blur-3xl" />
      {/* inner ring for a machined-metal edge */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />

      <div className="relative flex items-start justify-between">
        <ChipGlyph gradient={v.chip} />
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
          <Icon className="size-4" />
        </div>
      </div>

      <div className="relative mt-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">{label}</p>
        <p className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight drop-shadow-sm sm:text-3xl">
          {prefix}
          {formatValue(animated)}
        </p>
        {subtitle && <p className="mt-1 break-words text-[11px] text-white/70">{subtitle}</p>}

        {progress && (
          <div className="mt-2.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(Math.max(progress.pct, 0), 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/70">{progress.label}</p>
          </div>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between border-t border-white/15 pt-3">
        <p className="font-mono text-[11px] tracking-[0.25em] text-white/60">•••• •••• •••• {mask ?? 'ERP'}</p>
        <div className="flex items-center -space-x-2.5 opacity-80">
          <div className="size-4 rounded-full bg-white/40" />
          <div className="size-4 rounded-full bg-white/70 mix-blend-screen" />
        </div>
      </div>
    </div>
  );
}
