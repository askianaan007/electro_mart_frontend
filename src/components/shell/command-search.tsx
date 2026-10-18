'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SearchItem {
  label: string;
  href: string;
  group?: string;
  icon: LucideIcon;
}

/**
 * Jump-to-page search (⌘K / Ctrl+K). Searches the navigation itself, so it
 * never promises results it can't deliver.
 */
export function CommandSearch({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.group?.toLowerCase().includes(q));
  }, [items, query]);

  function openChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery('');
      setActive(0);
    }
  }

  function go(item: SearchItem | undefined) {
    if (!item) return;
    openChange(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/40 hover:text-foreground sm:flex dark:bg-muted/40"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Go to page…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-[11px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
        aria-label="Search pages"
      >
        <Search className="size-[18px]" />
      </button>

      <Dialog open={open} onOpenChange={openChange}>
        <DialogContent title="Go to page" className="top-[15%] max-w-lg translate-y-0 gap-0 p-0 sm:p-0">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search pages…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search pages"
            />
          </div>
          <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin" role="listbox">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No pages match “{query}”</p>
            ) : (
              results.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm',
                      i === active ? 'bg-muted text-foreground' : 'text-foreground/90',
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    {item.group && <span className="text-xs text-muted-foreground">{item.group}</span>}
                    {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
