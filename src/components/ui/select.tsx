'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-left text-sm shadow-xs transition-[border-color,box-shadow] data-[placeholder]:text-muted-foreground focus:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60 dark:bg-muted/40 [&>span]:line-clamp-1',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** Lists with at least this many options get a search box automatically. */
const SEARCH_MIN_ITEMS = 7;

/** The current search text, read by every SelectItem to decide if it matches. */
const SelectSearchContext = React.createContext('');

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (React.isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children);
  return '';
}

function itemMatches(text: string, query: string) {
  const q = query.trim().toLowerCase();
  return !q || text.toLowerCase().includes(q);
}

/** Counts the SelectItems in a children tree (through fragments, groups and arrays). */
function countItems(node: React.ReactNode, query = ''): number {
  let n = 0;
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { children?: React.ReactNode; textValue?: string };
    if (child.type === SelectItem) {
      if (itemMatches(props.textValue ?? nodeText(props.children), query)) n += 1;
    } else {
      n += countItems(props.children, query);
    }
  });
  return n;
}

function SelectContent({
  className,
  children,
  position = 'popper',
  searchable,
  searchPlaceholder = 'Search…',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  /** Force the search box on or off. By default it appears for long lists. */
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const withSearch = searchable ?? countItems(children) >= SEARCH_MIN_ITEMS;
  const viewportClassName = cn(
    'p-1',
    position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
  );

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-[min(24rem,var(--radix-select-content-available-height))] min-w-32 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-ui-pop-in',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        {withSearch ? (
          <SelectSearch placeholder={searchPlaceholder} viewportClassName={viewportClassName}>
            {children}
          </SelectSearch>
        ) : (
          <SelectPrimitive.Viewport className={viewportClassName}>{children}</SelectPrimitive.Viewport>
        )}
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/**
 * Search box pinned above a Select's options; filters them on the client.
 * It lives inside SelectPrimitive.Content, which remounts on every open, so
 * the search text starts empty each time the list opens.
 */
function SelectSearch({
  placeholder,
  viewportClassName,
  children,
}: {
  placeholder: string;
  viewportClassName: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  // Until the user points at or arrows into the list, keep focus in the search box
  // (Radix moves focus to the selected option once the list is positioned).
  const userNavigated = React.useRef(false);
  const matches = countItems(children, query);

  const selectFirstMatch = () => {
    const first = listRef.current?.querySelector<HTMLElement>('[role="option"]:not([data-disabled])');
    if (!first) return;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  };

  return (
    <SelectSearchContext.Provider value={query}>
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-popover p-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                selectFirstMatch();
                return;
              }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                userNavigated.current = true;
                return; // let Radix move focus into the options
              }
              // Escape/Tab go to Radix (close / trap); everything else is typing,
              // which must not reach Radix's type-ahead or space-to-select.
              if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation();
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 dark:bg-muted/40 sm:h-8 sm:text-sm"
          />
        </div>
      </div>
      <div
        ref={listRef}
        className="contents"
        onPointerMove={() => {
          userNavigated.current = true;
        }}
        onFocus={(e) => {
          if (!userNavigated.current && e.target !== inputRef.current) inputRef.current?.focus({ preventScroll: true });
        }}
        onKeyDownCapture={(e) => {
          // Typing while an option is focused goes back into the search box.
          const typing =
            (e.key.length === 1 || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey;
          if (typing && e.target !== inputRef.current) {
            e.stopPropagation();
            inputRef.current?.focus({ preventScroll: true });
          }
        }}
      >
        <SelectPrimitive.Viewport className={viewportClassName}>
          {children}
          {matches === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">No matches for “{query.trim()}”</div>
          )}
        </SelectPrimitive.Viewport>
      </div>
    </SelectSearchContext.Provider>
  );
}

function SelectItem({
  className,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const query = React.useContext(SelectSearchContext);
  // Non-matching options stay mounted (the closed trigger still shows the
  // selected one) but are hidden and disabled so arrow keys skip them.
  const hidden = !itemMatches(props.textValue ?? nodeText(children), query);
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-muted data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        hidden && 'hidden',
        className,
      )}
      disabled={disabled || hidden}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
