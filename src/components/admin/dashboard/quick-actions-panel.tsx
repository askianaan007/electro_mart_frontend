'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  FileBarChart,
  HandCoins,
  Plus,
  ShoppingCart,
  Truck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'New Sale', href: '/admin/orders/new', icon: ShoppingCart },
  { label: 'New Purchase', href: '/admin/purchases/new', icon: Truck },
  { label: 'Record Expense', href: '/admin/expenses', icon: CreditCard },
  { label: 'Receive Payment', href: '/admin/payments', icon: Wallet },
  { label: 'Supplier Payment', href: '/admin/credits', icon: HandCoins },
  { label: 'Create Dealer', href: '/admin/dealers', icon: UserPlus },
  { label: 'Generate Report', href: '/admin/sales-analysis', icon: FileBarChart },
];

export function QuickActionsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 sm:right-8 print:hidden">
      <div
        className={cn(
          'flex flex-col items-end gap-2 transition-all duration-200',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        {ACTIONS.map((action, index) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            onClick={() => setOpen(false)}
            tabIndex={open ? undefined : -1}
            style={{ transitionDelay: open ? `${index * 25}ms` : '0ms' }}
            className={cn(
              'flex items-center gap-2 rounded-full border border-border bg-popover py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-popover-foreground shadow-md transition-all duration-200 hover:border-primary/40 hover:text-primary',
              open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <action.icon className="size-3.5" />
            </span>
            {action.label}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        <Plus className={cn('size-5 transition-transform duration-200', open && 'rotate-45')} />
      </button>
    </div>
  );
}
