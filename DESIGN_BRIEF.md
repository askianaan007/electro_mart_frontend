# Electro Mart UI redesign — brief for page work

Goal: a calm, professional, data-dense business UI (think Linear / Stripe dashboard). **Light theme is primary**, dark is a full-quality secondary theme. The foundation (tokens, primitives, shell, shared components) is already done — your job is to bring pages up to it.

## ABSOLUTE RULES — logic must not change
- Do NOT change any data fetching, hooks, mutations, query params, form schemas/validation, calculations, conditions, routing, permissions, or API calls. Do not rename/remove props or exports used elsewhere.
- Do NOT reorder/remove business fields, columns, buttons or features. Every action that exists must still exist and behave identically.
- Only change: JSX structure/markup for layout, classNames, text styling, which shared presentational component renders something, and loading/error/empty presentation.
- If a page is missing a loading, error or empty state for a query it renders, ADD it using that query's existing `isLoading` / `isError` / `error` / `refetch` (already returned by the hook — destructure them). Never change the hook call itself.
- Do NOT touch print layouts: `components/invoice-print-layout.tsx`, `components/admin/*-print-layout.tsx`, or anything under `print:` classes' intent. Keep every `print:hidden` / `print:*` class.
- Do NOT edit files outside your assigned list, and never edit `src/components/ui/*`, `page-header.tsx`, `section-header.tsx`, `empty-state.tsx`, `query-error-state.tsx`, `loading-state.tsx`, `pagination-bar.tsx`, `filter-bar.tsx`, `stat-card.tsx`, `status-badge.tsx`, `shell/*`, `globals.css`. If you need something from them that doesn't exist, report it instead.

## Colour rules
- Use ONLY semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary`, `bg-accent text-accent-foreground`, and status tokens `success`, `warning`, `destructive`, `info`, `purple` (e.g. `bg-success/10 text-success`, `border-warning/25`).
- Chart colours: `var(--chart-1)` … `var(--chart-5)` (recharts `stroke="var(--chart-1)"`).
- REMOVE raw palette colours (`blue-500`, `slate-900`, `rose-400`, `emerald-600`, `amber-*`, `purple-*`, `indigo-*`, hex codes, gradients like `from-blue-950 via-…`), glows (`drop-shadow-[...]`), glassmorphism (`backdrop-blur-*` on cards), `animate-ping`, heavy shadows. Map them: blue→primary, emerald/green→success, amber/orange/yellow→warning, rose/red→destructive, sky/cyan→info, purple/violet→purple, slate/gray→muted-foreground/foreground/border.
- Money in red/green only where it carries meaning (negative/overdue = destructive, received/positive = success). Neutral totals use `text-foreground`.
- Warning-coloured TEXT: use `text-warning-foreground dark:text-warning` (plain `text-warning` is too light on white for small text). Icons on tints can use `text-warning`.

## Layout patterns (copy these exactly)
Reference implementation: `src/app/admin/payments/page.tsx`.

Page root: `<div className="space-y-6">`.

Page title — always the shared component:
```tsx
import { PageHeader } from '@/components/page-header';
<PageHeader
  title="Orders"
  description="One sentence about what this page is for."
  backHref="/admin/orders"        // detail/edit/new pages only
  meta={<OrderStatusBadge status={order.status} />}  // optional
  actions={<Button>…</Button>}    // primary action LAST (rightmost)
/>
```

Panels / list containers:
```tsx
<div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
  <SectionHeader title="…" description="…" isFetching={isFetching && !isLoading} className="pb-3" actions={…} />
  <FilterBar>…filters…</FilterBar>
  {isLoading ? <TableSkeleton rows={6} /> : isError ? <QueryErrorState error={error} onRetry={() => refetch()} /> : empty ? <EmptyState … /> : (<>table… <PaginationBar …/></>)}
</div>
```
Or `Card` / `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` from `@/components/ui/card` for content sections.

Order of state checks: **loading → error → empty → data**. Detail pages: use `PageSkeleton` from `@/components/loading-state` while loading and `QueryErrorState` on error (with a back link/PageHeader still visible where possible).

Stat rows: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` of `StatCard` (`tone`: default | info | success | warning | destructive | purple). Numbers get `tabular-nums`.

Tables: the `Table` primitive no longer draws its own border — put it inside a panel (above). Right-align numeric/money columns (`className="text-right"` on both TableHead and TableCell). Amount cells `font-medium tabular-nums`. Secondary info in a cell: `<div className="text-xs text-muted-foreground">`. Row action buttons: `size="sm" variant="outline"` (or `ghost` for icon-only with `aria-label`). Keep existing mobile card layouts (`lg:hidden`) but style them `rounded-lg border border-border bg-card p-4`.

Forms: labels above fields, `grid gap-4 sm:grid-cols-2` for field grids, section dividers with a small `text-sm font-semibold` heading. Submit buttons keep their `loading` prop.

Typography: page h1 handled by PageHeader. Section titles `text-[15px] font-semibold tracking-tight`. Body `text-sm`. Helper `text-xs text-muted-foreground`. Do not use `font-black`/`font-extrabold`/`uppercase tracking-[0.2em]` decorations except table heads (already handled by the primitive).

Spacing: 4/6 scale — `gap-4`, `space-y-6` between page sections, `p-4 sm:p-5` inside cards. Radius: `rounded-xl` for panels, `rounded-lg` for inner tiles, `rounded-md` for controls.

Icons: lucide, `size-4` in buttons (default), `size-[18px]` in tiles.

## Loading / error / feedback
- Initial load: skeleton (`TableSkeleton` / `PageSkeleton` / `Skeleton` shaped like content). Background refetch: `isFetching` spinner via SectionHeader + existing `opacity-60` on the list.
- Errors: `QueryErrorState` with `onRetry={() => refetch()}`. Mutations already toast errors — keep that.
- Buttons doing async work: pass the existing `isPending` as `loading` / `disabled` if it isn't already (this is presentation only — it doesn't change logic). Do NOT add new mutations.
- Destructive confirms: AlertDialogAction with `className={buttonVariants({ variant: 'destructive' })}` or existing destructive classes.

## When done
Run `npx tsc --noEmit` from the frontend root and `npx eslint <your files>`; fix anything you introduced (pre-existing warnings like `react-hooks/incompatible-library` on `form.watch` are fine to leave). Report: files changed, any states you added, anything you deliberately left alone, and anything you needed from shared components.
