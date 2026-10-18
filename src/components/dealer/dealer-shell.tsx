'use client';

import { useMemo } from 'react';
import { SidebarNav } from '@/components/shell/sidebar-nav';
import { Topbar } from '@/components/shell/topbar';
import { Brand } from '@/components/shell/brand';
import { BottomNav } from '@/components/dealer/bottom-nav';
import { dealerNavItems } from '@/components/dealer/dealer-nav-items';
import { useDealerDashboard } from '@/hooks/use-dashboard';

export function DealerShell({ children }: { children: React.ReactNode }) {
  const { data } = useDealerDashboard();
  const searchItems = useMemo(() => dealerNavItems.map((i) => ({ ...i })), []);

  return (
    <div className="flex min-h-svh bg-background print:block">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-5">
          <Brand subtitle="Dealer portal" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <SidebarNav groups={[{ items: dealerNavItems }]} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <Topbar
            showLogo
            searchItems={searchItems}
            notification={{ count: data?.pendingOrders, href: '/dealer/orders', label: 'Pending orders' }}
          />
        </div>
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-24 sm:p-6 lg:px-8 lg:pb-8 print:max-w-none print:p-0">
          {children}
        </main>
      </div>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
