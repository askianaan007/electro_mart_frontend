'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AdminNavGroup } from '@/components/admin/admin-nav-items';

export function SidebarNav({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 p-3.5 select-none">
      {groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-1">
          {group.label && (
            <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80 dark:text-slate-400/70">
                {group.label}
              </span>
              <span className="h-px flex-1 ml-3 bg-gradient-to-r from-border/60 to-transparent" />
            </div>
          )}
          {group.items.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold shadow-md shadow-indigo-600/30 border border-white/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/60 backdrop-blur-md hover:translate-x-1 border border-transparent'
                )}
              >
                <Icon
                  className={cn(
                    'size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    active
                      ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-cyan-400'
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-xs border',
                      active
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25'
                    )}
                  >
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

