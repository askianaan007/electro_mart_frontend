'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { dealerNavItems } from '@/components/dealer/dealer-nav-items';
import { useCartStore } from '@/stores/cart-store';

export function BottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="grid grid-cols-5">
        {dealerNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <div className="relative">
                <Icon className="size-5" />
                {item.href === '/dealer/cart' && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
