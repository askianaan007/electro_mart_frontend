'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ArrowLeft, Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { cn } from '@/lib/utils';

/** Phones and touch tablets get the full-screen picker; mouse screens get a dropdown. */
const SHEET_QUERY = '(max-width: 639px), (pointer: coarse) and (max-width: 1023px)';

function subscribeMedia(onChange: () => void) {
  const list = window.matchMedia(SHEET_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function useSheetLayout() {
  return React.useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia(SHEET_QUERY).matches,
    () => false,
  );
}

/** Every word typed must appear somewhere in the item's text. */
function matches(text: string, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export interface SearchPickerProps<T> {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  getId: (item: T) => string;
  /** Everything the search should match: name, code, brand, phone… */
  getSearchText: (item: T) => string;
  /** One row in the list. */
  renderItem: (item: T) => React.ReactNode;
  /** The chosen item inside the closed trigger. */
  renderValue: (item: T) => React.ReactNode;
  placeholder: string;
  searchPlaceholder?: string;
  /** Heading of the full-screen picker on phones. */
  title: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  /** Shown at the start of the closed box (e.g. a search icon for "add item" pickers). */
  icon?: React.ReactNode;
}

/**
 * Searchable single-choice picker built for touch as much as for mouse.
 * Phones: a full-screen panel with a pinned 16px search box (no iOS zoom),
 * a list sized above the keyboard, and dragging the list hides the keyboard.
 * Desktop: an anchored dropdown with arrow-key navigation.
 */
export function SearchPicker<T>(props: SearchPickerProps<T>) {
  const { items, value, getId, renderValue, placeholder, disabled, invalid, className, id, icon } = props;
  const [open, setOpen] = React.useState(false);
  const sheet = useSheetLayout();
  const selected = items.find((item) => getId(item) === value);

  const trigger = (
    <button
      id={id}
      type="button"
      disabled={disabled}
      aria-haspopup="listbox"
      aria-expanded={open}
      data-invalid={invalid || undefined}
      onClick={sheet ? () => setOpen(true) : undefined}
      className={cn(
        'flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-left text-sm shadow-xs transition-[border-color,box-shadow] hover:bg-muted/40 focus:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 data-invalid:border-destructive dark:bg-muted/40',
        className,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        {selected ? renderValue(selected) : <span className="block truncate text-muted-foreground">{placeholder}</span>}
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );

  const pick = (itemId: string) => {
    props.onChange(itemId);
    setOpen(false);
  };

  if (sheet) {
    return (
      <>
        {trigger}
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            {open && <SheetPanel {...props} onPick={pick} onClose={() => setOpen(false)} />}
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </>
    );
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-50 flex max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[max(var(--radix-popover-trigger-width),20rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-ui-pop-in"
        >
          <PickerList {...props} onPick={pick} variant="dropdown" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function SheetPanel<T>(props: SearchPickerProps<T> & { onPick: (id: string) => void; onClose: () => void }) {
  const viewport = useVisualViewport();
  return (
    <DialogPrimitive.Content
      aria-describedby={undefined}
      // Don't pop the keyboard up on open: the list shows first; tap search to type.
      onOpenAutoFocus={(e) => e.preventDefault()}
      className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col bg-background data-[state=open]:animate-ui-fade-in"
      style={viewport ? { height: viewport.height, top: viewport.top } : undefined}
    >
      <div className="flex items-center gap-2 border-b border-border px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={props.onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <DialogPrimitive.Title className="truncate text-base font-semibold">{props.title}</DialogPrimitive.Title>
      </div>
      <PickerList {...props} variant="sheet" />
    </DialogPrimitive.Content>
  );
}

function PickerList<T>({
  items,
  value,
  getId,
  getSearchText,
  renderItem,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing found',
  loading,
  onPick,
  variant,
}: SearchPickerProps<T> & { onPick: (id: string) => void; variant: 'sheet' | 'dropdown' }) {
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const sheet = variant === 'sheet';

  const filtered = React.useMemo(
    () => items.filter((item) => matches(getSearchText(item), query)),
    [items, getSearchText, query],
  );
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0));

  function moveTo(index: number) {
    setActive(index);
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <>
      <div className={cn('shrink-0 border-b border-border', sheet ? 'p-3' : 'p-1.5')}>
        <div className="relative">
          <Search
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
              sheet ? 'left-3 size-4' : 'left-2.5 size-3.5',
            )}
          />
          <input
            ref={inputRef}
            value={query}
            autoFocus={!sheet}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              listRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveTo(Math.min(activeIndex + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveTo(Math.max(activeIndex - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filtered[activeIndex];
                if (item) onPick(getId(item));
                else if (sheet) inputRef.current?.blur();
              }
            }}
            placeholder={searchPlaceholder}
            type="search"
            enterKeyHint={sheet ? 'done' : 'go'}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            className={cn(
              'w-full rounded-md border border-input bg-card pr-9 outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20 dark:bg-muted/40 [&::-webkit-search-cancel-button]:hidden',
              // 16px text stops iOS Safari from zooming the page when the box is focused.
              sheet ? 'h-11 pl-9 text-base' : 'h-9 pl-8 text-sm',
            )}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setActive(0);
                inputRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {sheet && (
          <p className="mt-2 text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${filtered.length} of ${items.length}`}
          </p>
        )}
      </div>

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        // Dragging the list puts the keyboard away so more rows are visible.
        onTouchMove={sheet ? () => inputRef.current?.blur() : undefined}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin',
          sheet ? 'pb-[env(safe-area-inset-bottom)]' : 'p-1',
        )}
      >
        {loading && items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          filtered.map((item, index) => {
            const itemId = getId(item);
            const isSelected = itemId === value;
            return (
              <button
                key={itemId}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onClick={() => onPick(itemId)}
                onMouseMove={sheet ? undefined : () => index !== activeIndex && setActive(index)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 text-left text-sm transition-colors',
                  sheet ? 'min-h-14 border-b border-border px-4 py-2.5 active:bg-muted' : 'rounded-md px-2.5 py-2',
                  !sheet && index === activeIndex && 'bg-muted',
                  isSelected && 'bg-accent text-accent-foreground',
                )}
              >
                <span className="min-w-0 flex-1">{renderItem(item)}</span>
                {isSelected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
