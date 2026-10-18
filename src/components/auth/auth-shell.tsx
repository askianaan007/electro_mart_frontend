'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Boxes, ShieldCheck, Store, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  role?: 'ADMIN' | 'DEALER';
  onRoleChange?: (role: 'ADMIN' | 'DEALER') => void;
  showRoleToggle?: boolean;
}

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Boxes, title: 'Smart Inventory', description: 'Real-time stock and product tracking' },
  { icon: TrendingUp, title: 'Business Insights', description: 'Sales, collections and dealer performance' },
  { icon: ShieldCheck, title: 'Secure & Reliable', description: 'Role-based access, encrypted sessions' },
];

/** Inline error banner shown above an auth form's submit button. */
export function AuthErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Frame shared by every unauthenticated page (login, forgot/reset password):
 * the showroom photo full-bleed under a navy brand overlay, the brand story
 * on the left (desktop), and the form in a floating card on the right.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  role = 'ADMIN',
  onRoleChange,
  showRoleToggle = false,
}: AuthShellProps) {
  const [internalRole, setInternalRole] = useState<'ADMIN' | 'DEALER'>(role);

  const activeRole = role || internalRole;
  const isAdmin = activeRole === 'ADMIN';

  const handleToggle = (newRole: 'ADMIN' | 'DEALER') => {
    setInternalRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  return (
    <div className="relative isolate flex min-h-svh w-full overflow-hidden bg-brand-navy">
      {/* Background photo + brand overlay */}
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 scale-105 object-cover object-center blur-[1.5px]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(100deg, rgba(0,12,34,0.97) 0%, rgba(0,16,44,0.93) 34%, rgba(0,22,58,0.62) 58%, rgba(0,22,58,0.38) 78%, rgba(0,16,42,0.6) 100%)',
        }}
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16 lg:px-12 xl:px-16">
        {/* Brand story — desktop */}
        <section className="hidden flex-col text-white lg:flex">
          <h2 className="text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl">
            Electro <span className="text-brand-red">Mart</span>
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white/95 xl:text-4xl">ERP &amp; Dealer Portal</p>

          <div className="mt-7 flex h-[3px] w-24 overflow-hidden rounded-full" aria-hidden>
            <span className="w-1/3 bg-white/40" />
            <span className="w-1/4 bg-brand-red" />
            <span className="flex-1 bg-white/80" />
          </div>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-white/80">
            Powering your business with smart ERP solutions and seamless dealer management.
          </p>

          <ul className="mt-14 grid max-w-2xl grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] shadow-lg shadow-black/20">
                  <feature.icon className="size-[22px] text-brand-red" />
                </div>
                <p className="mt-4 text-[15px] font-semibold">{feature.title}</p>
                <p className="mt-1 text-sm leading-snug text-white/65">{feature.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Form card */}
        <main className="mx-auto w-full max-w-[460px]">
          <div className="rounded-2xl border border-white/10 bg-card px-6 py-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] sm:px-10 sm:py-10">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo-full-transparent.png"
                alt="Electro Mart"
                width={908}
                height={531}
                priority
                className="h-auto w-44 dark:brightness-0 dark:invert sm:w-48"
              />
              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
            </div>

            {showRoleToggle && (
              <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1">
                {(
                  [
                    { value: 'ADMIN', label: 'Admin Portal', icon: ShieldCheck },
                    { value: 'DEALER', label: 'Dealer Portal', icon: Store },
                  ] as const
                ).map((option) => {
                  const active = (option.value === 'ADMIN') === isAdmin;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        'flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
                        active ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <option.icon className="size-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6">{children}</div>

            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}

            <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Electro Mart. All rights reserved.
            </p>
          </div>

          {/* Mobile tagline under the card */}
          <p className="mt-6 text-center text-sm text-white/75 lg:hidden">
            Electro <span className="font-semibold text-brand-red">Mart</span>{' '}
            · ERP &amp; Dealer Portal
          </p>
        </main>
      </div>
    </div>
  );
}
