import { Wallet, CreditCard, HandCoins, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WalletCard({
  label,
  value,
  subtitle,
  tone = 'cash',
  icon: Icon,
  mask = 'CASH',
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: 'cash' | 'liability';
  icon?: LucideIcon;
  mask?: string;
}) {
  const DefaultIcon = tone === 'liability' ? HandCoins : Wallet;
  const CornerIcon = Icon ?? DefaultIcon;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-lg',
        tone === 'cash' && 'bg-gradient-to-br from-primary via-primary to-primary/70',
        tone === 'liability' && 'bg-gradient-to-br from-amber-600 via-amber-600 to-amber-800',
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 size-36 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-primary-foreground/70">{subtitle}</p>}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <CornerIcon className="size-5" />
        </div>
      </div>

      <div className="relative mt-8 flex items-center justify-between">
        <div className="flex size-8 items-center justify-center rounded-md bg-white/20">
          <CreditCard className="size-4" />
        </div>
        <p className="font-mono text-xs tracking-[0.3em] text-primary-foreground/50">•••• •••• •••• {mask}</p>
      </div>
    </div>
  );
}
