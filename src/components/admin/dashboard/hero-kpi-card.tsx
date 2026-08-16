'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ExternalLink, Radio } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const VARIANTS = {
  orange: {
    base: 'linear-gradient(135deg, #431407 0%, #7c2d12 35%, #ea580c 70%, #f97316 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(254,215,170,0.5), transparent 45%), radial-gradient(circle at 88% 85%, rgba(251,146,60,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(234,88,12,0.55)]',
    chip: 'from-amber-200 via-amber-300 to-yellow-500',
    accentBorder: 'border-amber-400/30',
  },
  red: {
    base: 'linear-gradient(135deg, #450a0a 0%, #881337 35%, #e11d48 70%, #f43f5e 100%)',
    mesh: 'radial-gradient(circle at 18% 15%, rgba(254,202,202,0.45), transparent 45%), radial-gradient(circle at 85% 82%, rgba(244,63,94,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(225,29,72,0.55)]',
    chip: 'from-rose-200 via-pink-300 to-red-400',
    accentBorder: 'border-rose-400/30',
  },
  green: {
    base: 'linear-gradient(135deg, #022c22 0%, #065f46 35%, #059669 70%, #10b981 100%)',
    mesh: 'radial-gradient(circle at 16% 14%, rgba(167,243,208,0.45), transparent 45%), radial-gradient(circle at 86% 84%, rgba(16,185,129,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(16,185,129,0.55)]',
    chip: 'from-emerald-200 via-teal-300 to-emerald-400',
    accentBorder: 'border-emerald-400/30',
  },
  blue: {
    base: 'linear-gradient(135deg, #0b132b 0%, #1e3a8a 38%, #1d4ed8 70%, #2563eb 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(191,219,254,0.45), transparent 45%), radial-gradient(circle at 88% 85%, rgba(59,130,246,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(30,58,138,0.65)]',
    chip: 'from-sky-100 via-blue-200 to-indigo-300',
    accentBorder: 'border-blue-400/30',
  },
  purple: {
    base: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 35%, #7c3aed 70%, #8b5cf6 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(221,214,254,0.45), transparent 45%), radial-gradient(circle at 88% 85%, rgba(139,92,246,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(124,58,237,0.55)]',
    chip: 'from-violet-200 via-purple-300 to-fuchsia-400',
    accentBorder: 'border-violet-400/30',
  },
  teal: {
    base: 'linear-gradient(135deg, #042f2e 0%, #115e59 35%, #0d9488 70%, #14b8a6 100%)',
    mesh: 'radial-gradient(circle at 14% 12%, rgba(153,246,228,0.45), transparent 45%), radial-gradient(circle at 88% 85%, rgba(45,212,191,0.4), transparent 50%)',
    glow: 'shadow-[0_20px_50px_-15px_rgba(13,148,136,0.55)]',
    chip: 'from-teal-200 via-cyan-300 to-teal-400',
    accentBorder: 'border-teal-400/30',
  },
} as const;

function ChipGlyph({ gradient }: { gradient: string }) {
  return (
    <div className={cn('relative flex h-6 w-9 items-center justify-center rounded-md bg-gradient-to-br shadow-md border border-white/40', gradient)}>
      <div className="grid h-3.5 w-6 grid-cols-3 grid-rows-2 gap-[1.5px] p-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[1px] bg-black/35 shadow-inner" />
        ))}
      </div>
      <div className="absolute inset-0 rounded-md bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
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
  href,
  onClick,
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
  /** When set, the whole card becomes a link that opens in a new tab. */
  href?: string;
  /** When set (and href is not), the whole card becomes a button — e.g. to open a breakdown dialog. */
  onClick?: () => void;
}) {
  const animated = useCountUp(value);
  const v = VARIANTS[gradient];

  const card = (
    <div
      className={cn(
        'group relative isolate flex h-full min-h-[195px] flex-col justify-between overflow-hidden rounded-[24px] border p-5 text-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl select-none',
        v.accentBorder,
        v.glow
      )}
      style={{ backgroundImage: `${v.mesh}, ${v.base}` }}
    >
      {/* Grain texture for a tactile frosted card finish */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG }}
      />

      {/* Specular glass reflection overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/5 to-transparent opacity-80" />
      <div className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[250%]" />

      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-3xl transition-transform duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute -bottom-14 -left-8 size-36 rounded-full bg-black/20 blur-3xl" />

      {/* Inner ring for machined edge finish */}
      <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/20" />

      {/* Header section with SIM chip and Icon badge */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChipGlyph gradient={v.chip} />
          <Radio className="size-4 text-white/60 animate-pulse" />
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
          <Icon className="size-4.5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
        </div>
      </div>

      {/* Main KPI value & label body */}
      <div className="relative mt-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/80 drop-shadow-xs">
            {label}
          </p>
          {href && (
            <ExternalLink className="size-3.5 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <p className="mt-1 break-words text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight drop-shadow-md">
          {prefix}
          {formatValue(animated)}
        </p>
        {subtitle && <p className="mt-1 break-words text-xs text-white/85 font-medium leading-relaxed">{subtitle}</p>}

        {progress && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/25 backdrop-blur-md p-0.5 border border-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-white via-white/95 to-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(Math.max(progress.pct, 0), 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/85 font-semibold">{progress.label}</p>
          </div>
        )}
      </div>

      {/* Card Footer Bar */}
      <div className="relative mt-3.5 flex items-center justify-between border-t border-white/20 pt-3">
        <p className="font-mono text-[11px] font-bold tracking-[0.25em] text-white/70">
          •••• •••• •••• {mask ?? 'ERP'}
        </p>
        <div className="flex items-center -space-x-2.5 opacity-90">
          <div className="size-4.5 rounded-full bg-white/40 backdrop-blur-xs" />
          <div className="size-4.5 rounded-full bg-white/75 mix-blend-screen shadow-sm" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open full ${label} history in a new tab`}
        className="block h-full rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {card}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block h-full w-full rounded-[24px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {card}
      </button>
    );
  }

  return card;
}

