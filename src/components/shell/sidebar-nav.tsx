'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AdminNavGroup } from '@/components/admin/admin-nav-items';

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (!href.endsWith('/dashboard') && pathname.startsWith(`${href}/`));
}

export function SidebarNav({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex select-none flex-col gap-5 px-3 py-4" aria-label="Main">
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-primary" aria-hidden />
                )}
                <Icon
                  className={cn(
                    'size-[18px] shrink-0',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1.5 text-[11px] font-semibold text-destructive tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
