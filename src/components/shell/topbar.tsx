'use client';

import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { UserMenu } from '@/components/shell/user-menu';
import { Brand } from '@/components/shell/brand';
import { CommandSearch, type SearchItem } from '@/components/shell/command-search';

export function Topbar({
  onMenuClick,
  notification,
  searchItems,
  showLogo = false,
}: {
  onMenuClick?: () => void;
  /** Bell links here; the dot shows when count > 0. */
  notification?: { count?: number; href: string; label: string };
  searchItems?: SearchItem[];
  showLogo?: boolean;
}) {
  const count = notification?.count ?? 0;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 sm:gap-3 sm:px-6">
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      )}

      {showLogo && <Brand className="lg:hidden" />}

      <div className="flex flex-1 items-center justify-end sm:justify-start">
        {searchItems && <CommandSearch items={searchItems} />}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        {notification && (
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link
              href={notification.href}
              aria-label={count > 0 ? `${notification.label}: ${count}` : notification.label}
              title={count > 0 ? `${count} ${notification.label.toLowerCase()}` : notification.label}
            >
              <Bell className="size-[18px] text-muted-foreground" />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-card tabular-nums">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </Button>
        )}
        <div className="ml-1.5 border-l border-border pl-2.5">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
