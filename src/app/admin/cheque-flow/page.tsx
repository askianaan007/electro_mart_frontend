'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarRange,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  Search,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';
import { QueryErrorState } from '@/components/query-error-state';
import { AlertsPanel } from '@/components/cheque-flow/alerts-panel';
import { ChequeFormDialog } from '@/components/cheque-flow/cheque-form-dialog';
import { ChequeSideTable, type ChequeRowActions } from '@/components/cheque-flow/cheque-side-table';
import { ImportDialog } from '@/components/cheque-flow/import-dialog';
import { LinkedStatusDialog } from '@/components/cheque-flow/linked-status-dialog';
import { MonthlyChart } from '@/components/cheque-flow/monthly-chart';
import { SummaryCards } from '@/components/cheque-flow/summary-cards';
import { TimelineCard } from '@/components/cheque-flow/timeline-card';
import {
  useChequeFlow,
  useChequeFlowAlerts,
  useChequeFlowMonthly,
  useChequeFlowOptions,
  useDeleteChequeFlow,
  useRestoreChequeFlow,
  useSetChequeFlowStatus,
} from '@/hooks/use-cheque-flow';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import {
  MONTH_NAMES,
  SIDE_META,
  STATUS_META,
  STATUS_ORDER,
  bySide,
  formatDay,
  groupByMonth,
  isMonth,
  monthLabel,
  shiftMonth,
  sideTotals,
} from '@/lib/cheque-flow';
import { businessToday, cn, formatCurrency } from '@/lib/utils';
import type {
  ChequeFlowDirection,
  ChequeFlowEntry,
  ChequeFlowFilters,
  ChequeFlowSource,
  ChequeFlowStatus,
} from '@/lib/api/types';

const ALL = '__all__';
const SOURCE_OPTIONS: Record<ChequeFlowSource, string> = {
  MANUAL: 'Added here',
  PAYMENT: 'Payments',
  SETTLEMENT: 'Credits',
  REFUND: 'Refunds',
};
type SideView = 'both' | ChequeFlowDirection;

export default function ChequeFlowPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[480px] rounded-xl" />}>
      <ChequeFlow />
    </Suspense>
  );
}

function ChequeFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = businessToday();
  const currentMonth = today.slice(0, 7);

  // ?month=YYYY-MM or ?month=all; anything else falls back to this month.
  const monthParam = params.get('month');
  const allMonths = monthParam === 'all';
  const month = allMonths ? null : isMonth(monthParam) ? monthParam : currentMonth;

  function setMonth(next: string | null) {
    const sp = new URLSearchParams(params.toString());
    sp.set('month', next ?? 'all');
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const [search, setSearch] = useState('');
  const [bank, setBank] = useState('');
  const [customer, setCustomer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [status, setStatus] = useState<ChequeFlowStatus | ''>('');
  const [source, setSource] = useState<ChequeFlowSource | ''>('');
  const [sideView, setSideView] = useState<SideView>('both');
  const debouncedSearch = useDebouncedValue(search.trim());

  const filters: ChequeFlowFilters = {
    search: debouncedSearch || undefined,
    bank: bank || undefined,
    customer: customer || undefined,
    supplier: supplier || undefined,
    status: status ? [status] : undefined,
    source: source || undefined,
  };
  const filterParts = [
    debouncedSearch && `search "${debouncedSearch}"`,
    bank && `bank ${bank}`,
    customer && `customer ${customer}`,
    supplier && `supplier ${supplier}`,
    status && `status ${STATUS_META[status].label}`,
    source && `from ${SOURCE_OPTIONS[source]}`,
  ].filter(Boolean) as string[];
  const isFiltered = filterParts.length > 0;
  const filterLabel = isFiltered ? `Filtered: ${filterParts.join(', ')}` : '';

  function clearFilters() {
    setSearch('');
    setBank('');
    setCustomer('');
    setSupplier('');
    setStatus('');
    setSource('');
  }

  const list = useChequeFlow({ ...filters, month: month ?? undefined });
  const alerts = useChequeFlowAlerts();
  const monthly = useChequeFlowMonthly(filters);
  const { data: options } = useChequeFlowOptions();

  const data = list.data;
  const periodLabel = month ? monthLabel(month) : 'All months';
  const entries = useMemo(() => data?.entries ?? [], [data]);
  const sections = useMemo(() => (allMonths ? groupByMonth(entries) : []), [allMonths, entries]);

  // ── Dialogs ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<{ entry?: ChequeFlowEntry; direction?: ChequeFlowDirection } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [clearing, setClearing] = useState<ChequeFlowEntry | null>(null);
  // A cheque recorded in Payments / Credits / Refunds: its status changes go through that page's rules.
  const [linked, setLinked] = useState<{ entry: ChequeFlowEntry; status: ChequeFlowStatus | null } | null>(null);
  const [deleting, setDeleting] = useState<ChequeFlowEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const setStatusMutation = useSetChequeFlowStatus();
  const remove = useDeleteChequeFlow();
  const restore = useRestoreChequeFlow();

  function changeStatus(entry: ChequeFlowEntry, next: ChequeFlowStatus, clearedDate?: string) {
    setBusyId(entry.id);
    setStatusMutation.mutate(
      { id: entry.id, status: next, clearedDate },
      {
        onSuccess: () => {
          toast.success(
            `Cheque ${entry.chequeNumber ?? ''} marked ${STATUS_META[next].label.toLowerCase()}`.replace('  ', ' '),
          );
          setClearing(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setBusyId(null),
      },
    );
  }

  const actions: ChequeRowActions = {
    onEdit: (entry) => setForm({ entry }),
    onDelete: setDeleting,
    onStatus: (entry, next) => {
      if (entry.source !== 'MANUAL') setLinked({ entry, status: next });
      else if (next === 'CLEARED') setClearing(entry);
      else changeStatus(entry, next);
    },
    busyId,
  };

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    remove.mutate(target.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success('Cheque deleted', {
          action: {
            label: 'Undo',
            onClick: () =>
              restore.mutate(target.id, {
                onSuccess: () => toast.success('Cheque restored'),
                onError: (e) => toast.error(getErrorMessage(e)),
              }),
          },
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  async function exportAs(kind: 'excel' | 'pdf') {
    if (!data) return;
    setExporting(kind);
    try {
      const fileBase = `cheque-flow-${month ?? 'all-months'}`;
      // Manual copies of linked cheques are left out — the linked cheque is exported once.
      const entries = data.entries.filter((e) => !e.duplicateOf);
      const opts = { periodLabel, filterLabel, entries, summary: data.summary, fileBase };
      if (kind === 'excel') {
        const { downloadChequeFlowExcel } = await import('@/lib/cheque-flow-export');
        await downloadChequeFlowExcel(opts);
      } else {
        const { downloadChequeFlowPdf } = await import('@/lib/cheque-flow-export');
        await downloadChequeFlowPdf(opts);
      }
    } catch (e) {
      toast.error(`Couldn't create the ${kind === 'excel' ? 'Excel file' : 'PDF'}: ${getErrorMessage(e)}`);
    } finally {
      setExporting(null);
    }
  }

  function openFromAlert(entry: ChequeFlowEntry) {
    const m = entry.chequeDate.slice(0, 7);
    if (!allMonths && m !== month) setMonth(m);
    if (entry.source !== 'MANUAL') setLinked({ entry, status: null });
    else setForm({ entry });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const year = Number((month ?? currentMonth).slice(0, 4));
  const years = Array.from({ length: 9 }, (_, i) => Number(currentMonth.slice(0, 4)) - 4 + i);
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => a - b);

  return (
    <div className="space-y-5 print:space-y-3 print:p-6">
      <PageHeader
        title="Cheque Flow"
        description="Customer cheques to receive and supplier cheques to pay, month by month. Cheques recorded in Payments, Credits and Refunds appear here automatically; add any others by hand."
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload /> Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" loading={!!exporting} disabled={!data || !!exporting}>
                  {!exporting && <Download />} Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => exportAs('excel')}>
                  <FileSpreadsheet /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => exportAs('pdf')}>
                  <FileText /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.print()}>
                  <Printer /> Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setForm({})}>
              <Plus /> Add cheque
            </Button>
          </div>
        }
      />

      {/* Month control */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            disabled={allMonths}
            onClick={() => month && setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft />
          </Button>
          <Select
            value={month ? String(Number(month.slice(5))) : ''}
            onValueChange={(m) => setMonth(`${year}-${m.padStart(2, '0')}`)}
            disabled={allMonths}
          >
            <SelectTrigger className="w-[8.5rem]" aria-label="Month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(y) => setMonth(`${y}-${(month ?? currentMonth).slice(5)}`)}
            disabled={allMonths}
          >
            <SelectTrigger className="w-[6rem]" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            disabled={allMonths}
            onClick={() => month && setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {month !== currentMonth && (
            <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth)}>
              This month
            </Button>
          )}
          <Button
            variant={allMonths ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMonth(allMonths ? currentMonth : null)}
          >
            <CalendarRange /> All months
          </Button>
        </div>
      </div>

      <p className="hidden text-sm font-medium print:block">
        {periodLabel}
        {filterLabel && ` · ${filterLabel}`}
      </p>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))_auto] print:hidden">
        <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cheque no., name, bank, invoice, remarks"
            className="pl-9"
            aria-label="Search cheques"
          />
        </div>
        <FilterSelect label="Bank" value={bank} onChange={setBank} options={options?.banks} />
        <FilterSelect label="Customer" value={customer} onChange={setCustomer} options={options?.customers} />
        <FilterSelect label="Supplier" value={supplier} onChange={setSupplier} options={options?.suppliers} />
        <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? '' : (v as ChequeFlowStatus))}>
          <SelectTrigger aria-label="Status" className={cn(status && 'border-primary')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source || ALL} onValueChange={(v) => setSource(v === ALL ? '' : (v as ChequeFlowSource))}>
          <SelectTrigger aria-label="Recorded in" className={cn(source && 'border-primary')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {(Object.keys(SOURCE_OPTIONS) as ChequeFlowSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_OPTIONS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button variant="ghost" onClick={clearFilters} className="col-span-2 sm:col-span-1">
            <X /> Clear
          </Button>
        )}
      </div>
      {isFiltered && (
        <p className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground print:hidden">
          <Badge variant="warning">Filtered</Badge> {filterParts.join(' · ')} — totals below cover only matching
          cheques.
        </p>
      )}

      {list.isError && !data ? (
        <div className="rounded-xl border border-border bg-card">
          <QueryErrorState error={list.error} onRetry={() => list.refetch()} title="Couldn't load cheques" />
        </div>
      ) : (
        <>
          {data?.truncated && (
            <p className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              Showing the first 5,000 cheques only. Pick a single month or add a filter to see the rest — the totals
              still cover every matching cheque.
            </p>
          )}

          {!!data?.duplicates && (
            <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground print:hidden">
              <Copy className="mt-0.5 size-4 shrink-0" />
              {data.duplicates === 1
                ? '1 cheque you added by hand is also recorded in Payments/Credits/Refunds.'
                : `${data.duplicates} cheques you added by hand are also recorded in Payments/Credits/Refunds.`}{' '}
              They&apos;re shown greyed and not counted — remove the manual copy from its menu when convenient.
            </p>
          )}

          <SummaryCards summary={data?.summary} filtered={isFiltered} periodLabel={periodLabel} />

          <div className="print:hidden">
            <AlertsPanel alerts={alerts.data} month={month} onOpen={openFromAlert} />
          </div>

          {/* Mobile: one side at a time, or both stacked */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-1 lg:hidden print:hidden" role="tablist">
            {(['both', 'RECEIVABLE', 'PAYABLE'] as SideView[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={sideView === v}
                onClick={() => setSideView(v)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  sideView === v ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground',
                )}
              >
                {v === 'both' ? 'Both' : SIDE_META[v].short}
              </button>
            ))}
          </div>

          <div className={cn('transition-opacity', list.isFetching && data && 'opacity-70')}>
            {!data ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-[360px] rounded-xl" />
                <Skeleton className="h-[360px] rounded-xl" />
              </div>
            ) : allMonths ? (
              sections.length === 0 ? (
                <SidePair entries={[]} actions={actions} sideView={sideView} filtered={isFiltered} onAdd={setForm} />
              ) : (
                <div className="space-y-6">
                  {sections.map((s) => (
                    <MonthSection
                      key={s.month}
                      month={s.month}
                      entries={s.entries}
                      actions={actions}
                      sideView={sideView}
                      filtered={isFiltered}
                      onAdd={setForm}
                      onOpenMonth={() => setMonth(s.month)}
                    />
                  ))}
                </div>
              )
            ) : (
              <SidePair entries={entries} actions={actions} sideView={sideView} filtered={isFiltered} onAdd={setForm} />
            )}
          </div>

          {month && data && <TimelineCard days={data.timeline} periodLabel={periodLabel} />}
        </>
      )}

      <div className="print:hidden">
        {monthly.isError && !monthly.data ? (
          <div className="rounded-xl border border-border bg-card">
            <QueryErrorState error={monthly.error} onRetry={() => monthly.refetch()} title="Couldn't load the chart" />
          </div>
        ) : (
          <MonthlyChart data={monthly.data} selectedMonth={month} onSelectMonth={setMonth} />
        )}
      </div>

      <ChequeFormDialog
        open={!!form}
        onOpenChange={(o) => !o && setForm(null)}
        entry={form?.entry}
        direction={form?.direction}
        month={month ?? currentMonth}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <LinkedStatusDialog target={linked} onClose={() => setLinked(null)} />
      <ClearDialog
        entry={clearing}
        today={today}
        saving={setStatusMutation.isPending}
        onClose={() => setClearing(null)}
        onConfirm={(date) => clearing && changeStatus(clearing, 'CLEARED', date)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cheque?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  {SIDE_META[deleting.direction].short} cheque {deleting.chequeNumber ?? '(no number)'} —{' '}
                  {deleting.partyName}, {formatCurrency(deleting.amount)} on {formatDay(deleting.chequeDate)}. You can
                  undo straight after.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[] | undefined;
}) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger aria-label={label} className={cn('min-w-0', value && 'border-primary')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={ALL}>All {label.toLowerCase()}s</SelectItem>
        {options?.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SidePair({
  entries,
  actions,
  sideView,
  filtered,
  onAdd,
  titleSuffix,
}: {
  entries: ChequeFlowEntry[];
  actions: ChequeRowActions;
  sideView: SideView;
  filtered: boolean;
  onAdd: (form: { direction: ChequeFlowDirection }) => void;
  titleSuffix?: string;
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 print:grid-cols-2">
      {(['RECEIVABLE', 'PAYABLE'] as const).map((d) => (
        <div key={d} className={cn('min-w-0', sideView !== 'both' && sideView !== d && 'max-lg:hidden print:block')}>
          <ChequeSideTable
            direction={d}
            entries={bySide(entries, d)}
            actions={actions}
            onAdd={() => onAdd({ direction: d })}
            filtered={filtered}
            title={titleSuffix ? `${SIDE_META[d].title} — ${titleSuffix}` : undefined}
          />
        </div>
      ))}
    </div>
  );
}

function MonthSection({
  month,
  entries,
  actions,
  sideView,
  filtered,
  onAdd,
  onOpenMonth,
}: {
  month: string;
  entries: ChequeFlowEntry[];
  actions: ChequeRowActions;
  sideView: SideView;
  filtered: boolean;
  onAdd: (form: { direction: ChequeFlowDirection }) => void;
  onOpenMonth: () => void;
}) {
  const r = sideTotals(bySide(entries, 'RECEIVABLE'));
  const p = sideTotals(bySide(entries, 'PAYABLE'));
  const net = Math.round((r.pending - p.pending) * 100) / 100;
  return (
    <section className="space-y-3 break-inside-avoid-page">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <button type="button" onClick={onOpenMonth} className="text-base font-semibold hover:underline">
          {monthLabel(month)}
        </button>
        <p className="text-xs tabular-nums text-muted-foreground">
          Net pending{' '}
          <span className={cn('font-semibold', net < 0 ? 'text-destructive' : 'text-success')}>
            {net > 0 ? '+' : net < 0 ? '−' : ''}
            {formatCurrency(Math.abs(net))}
          </span>
        </p>
      </div>
      <SidePair
        entries={entries}
        actions={actions}
        sideView={sideView}
        filtered={filtered}
        onAdd={onAdd}
        titleSuffix={monthLabel(month)}
      />
    </section>
  );
}

function ClearDialog({
  entry,
  today,
  saving,
  onClose,
  onConfirm,
}: {
  entry: ChequeFlowEntry | null;
  today: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent title="Mark cheque cleared" className="sm:max-w-md">
        {/* Keyed so the date resets for each cheque. */}
        {entry && (
          <ClearForm
            key={entry.id}
            entry={entry}
            today={today}
            saving={saving}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClearForm({
  entry,
  today,
  saving,
  onClose,
  onConfirm,
}: {
  entry: ChequeFlowEntry;
  today: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
}) {
  const future = entry.chequeDate > today;
  const [date, setDate] = useState(future ? '' : today);
  const error = !date
    ? 'Enter the date the cheque cleared.'
    : date > today
      ? "The cleared date can't be in the future."
      : date < entry.chequeDate
        ? `Can't clear before the cheque date (${formatDay(entry.chequeDate)}).`
        : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) onConfirm(date);
      }}
    >
      <DialogHeader>
        <DialogTitle>Mark cheque cleared</DialogTitle>
        <DialogDescription>
          {SIDE_META[entry.direction].short} cheque {entry.chequeNumber ?? '(no number)'} — {entry.partyName},{' '}
          {formatCurrency(entry.amount)}, dated {formatDay(entry.chequeDate)}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5 py-4">
        <Label htmlFor="cleared-date">Cleared on</Label>
        <Input
          id="cleared-date"
          type="date"
          value={date}
          min={entry.chequeDate}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!error}
        />
        {future ? (
          <p className="text-xs text-destructive">
            This cheque is dated {formatDay(entry.chequeDate)} — it can&apos;t be cleared before then.
          </p>
        ) : (
          error && date && <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="success" loading={saving} disabled={!!error || future}>
          Mark cleared
        </Button>
      </DialogFooter>
    </form>
  );
}
