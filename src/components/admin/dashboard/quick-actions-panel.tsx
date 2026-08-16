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
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 sm:right-8">
      <div
        className={cn(
          'flex flex-col items-end gap-2.5 transition-all duration-300',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        {ACTIONS.map((action, index) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${index * 35}ms` : '0ms' }}
            className={cn(
              'flex items-center gap-2.5 rounded-full border border-border/80 bg-card/95 backdrop-blur-md py-2 pl-3.5 pr-4 text-xs font-bold text-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-primary/10',
              open ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
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
        className="group relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/25 transition-all duration-300 hover:scale-110 active:scale-95 ring-4 ring-primary/10"
      >
        <Plus className={cn('size-6 transition-transform duration-300', open && 'rotate-45')} />
      </button>
    </div>
  );
}

