'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Undo2,
  Upload,
  XCircle,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useChequeFlowImports,
  useCommitChequeFlowImport,
  usePreviewChequeFlowImport,
  useUndoChequeFlowImport,
} from '@/hooks/use-cheque-flow';
import { getErrorMessage } from '@/lib/api/error';
import {
  IMPORT_FIELDS,
  columnName,
  detectSheet,
  extractRows,
  missingFields,
  readWorkbook,
  type ImportBlock,
  type ImportField,
  type ParsedSheet,
  type SheetRows,
} from '@/lib/cheque-flow-import';
import { SIDE_META, STATUS_META, formatDay } from '@/lib/cheque-flow';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import type { ChequeFlowDirection, ChequeFlowImportPreview, ChequeFlowImportRow } from '@/lib/api/types';

type Step = 'file' | 'map' | 'preview';
type Filter = 'all' | 'ready' | 'duplicate' | 'error';

const NONE = '__none__';
const IGNORE = '__ignore__';

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Import cheques" mobileFullScreen className="sm:max-w-4xl">
        {/* Remounts on every open so a new import starts clean. */}
        {open && <ImportWizard close={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportWizard({ close }: { close: () => void }) {
  const [step, setStep] = useState<Step>('file');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<{ sheet: string; data: SheetRows }[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [blocks, setBlocks] = useState<ImportBlock[]>([]);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [clearedOnChequeDate, setClearedOnChequeDate] = useState(false);
  const [rows, setRows] = useState<ChequeFlowImportRow[]>([]);
  const [skippedSubtotals, setSkippedSubtotals] = useState(0);
  const [preview, setPreview] = useState<ChequeFlowImportPreview | null>(null);
  const [stale, setStale] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // One key per checked preview: a double click or retry can't import twice.
  const importKey = useRef<string>('');
  const fileInput = useRef<HTMLInputElement>(null);

  const previewMutation = usePreviewChequeFlowImport();
  const commit = useCommitChequeFlowImport();
  const undo = useUndoChequeFlowImport();

  const data = sheets.find((s) => s.sheet === sheetName)?.data ?? [];

  function pickSheet(name: string, all = sheets) {
    setSheetName(name);
    const rowsOf = all.find((s) => s.sheet === name)?.data ?? [];
    const detected = detectSheet(rowsOf);
    setParsed(detected);
    setBlocks(detected?.blocks ?? []);
    setFileError(
      detected ? null : 'No header row found on this sheet. It needs columns like "Cheque No", "Bank", "Amount".',
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setFileError(null);
    try {
      const all = await readWorkbook(file);
      if (all.length === 0) throw new Error('The workbook has no sheets.');
      setSheets(all);
      setFileName(file.name);
      // Prefer the first sheet that has a header row.
      const first = all.find((s) => detectSheet(s.data)) ?? all[0];
      pickSheet(first.sheet, all);
    } catch (e) {
      setFileError(getErrorMessage(e));
      setSheets([]);
      setParsed(null);
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const mappingProblems = blocks.flatMap((b) =>
    missingFields(b).map((f) => `${b.direction ? SIDE_META[b.direction].short : b.title}: map "${f}"`),
  );
  const activeBlocks = blocks.filter((b) => b.direction);

  function runPreview(nextRows: ChequeFlowImportRow[]) {
    if (nextRows.length === 0) {
      toast.error('No cheque rows found with this mapping.');
      return;
    }
    if (nextRows.length > 2000) {
      toast.error(`The file has ${nextRows.length} cheques — import at most 2,000 at a time.`);
      return;
    }
    previewMutation.mutate(
      { rows: nextRows, clearedOnChequeDate },
      {
        onSuccess: (result) => {
          setPreview(result);
          setStale(false);
          importKey.current = crypto.randomUUID();
          setStep('preview');
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function toPreview() {
    if (!parsed) return;
    const extracted = extractRows(data, parsed, blocks);
    setRows(extracted.rows);
    setSkippedSubtotals(extracted.skippedSubtotals);
    setFilter('all');
    runPreview(extracted.rows);
  }

  function editChequeNumber(index: number, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, chequeNumber: value } : r)));
    setStale(true);
  }

  function save() {
    if (!preview || stale) return;
    commit.mutate(
      {
        importKey: importKey.current,
        fileName,
        rows,
        clearedOnChequeDate,
        mapping: { sheet: sheetName, headerRow: parsed?.headerRow, blocks },
      },
      {
        onSuccess: (result) => {
          toast.success(
            `${result.inserted} cheque${result.inserted === 1 ? '' : 's'} imported${result.skipped ? `, ${result.skipped} skipped` : ''}`,
            {
              action: {
                label: 'Undo',
                onClick: () =>
                  undo.mutate(result.importId, {
                    onSuccess: (r) => toast.success(`Import undone — ${r.removed} cheques removed`),
                    onError: (e) => toast.error(getErrorMessage(e)),
                  }),
              },
            },
          );
          close();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-success" /> Import cheques from Excel
        </DialogTitle>
        <DialogDescription>
          {step === 'file' && 'Step 1 of 3 — choose your cheque sheet (.xlsx).'}
          {step === 'map' && 'Step 2 of 3 — check which column holds what.'}
          {step === 'preview' && 'Step 3 of 3 — review before saving. Nothing is saved until you press Save.'}
        </DialogDescription>
      </DialogHeader>

      {step === 'file' && (
        <FileStep
          reading={reading}
          error={fileError}
          fileName={fileName}
          sheets={sheets.map((s) => s.sheet)}
          sheetName={sheetName}
          onSheet={(name) => pickSheet(name)}
          fileInput={fileInput}
          onFile={onFile}
          ready={!!parsed}
          onNext={() => setStep('map')}
          onCancel={close}
        />
      )}

      {step === 'map' && parsed && (
        <>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Headers found on row {parsed.headerRow + 1} of <span className="font-medium">{sheetName}</span>. Month
              headings and subtotal rows (no name and no cheque number) are skipped automatically.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {blocks.map((block) => (
                <BlockMapping
                  key={block.id}
                  block={block}
                  headers={parsed.headers}
                  onChange={(next) => setBlocks((prev) => prev.map((b) => (b.id === block.id ? next : b)))}
                />
              ))}
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Switch checked={clearedOnChequeDate} onCheckedChange={setClearedOnChequeDate} className="mt-0.5" />
              <span className="text-sm">
                Use the cheque date as the cleared date
                <span className="block text-xs text-muted-foreground">
                  For rows marked Pass/Cleared without a cleared date. Off = leave the cleared date empty.
                </span>
              </span>
            </label>
            {mappingProblems.length > 0 && (
              <p className="rounded-md bg-destructive/[0.07] px-3 py-2 text-xs font-medium text-destructive">
                {mappingProblems.join(' · ')}
              </p>
            )}
            {activeBlocks.length === 0 && (
              <p className="rounded-md bg-destructive/[0.07] px-3 py-2 text-xs font-medium text-destructive">
                Choose Customer or Supplier for at least one block.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('file')}>
              <ArrowLeft /> Back
            </Button>
            <Button
              onClick={toPreview}
              loading={previewMutation.isPending}
              disabled={mappingProblems.length > 0 || activeBlocks.length === 0}
            >
              Check rows
            </Button>
          </DialogFooter>
        </>
      )}

      {step === 'preview' && preview && (
        <>
          <PreviewStep
            preview={preview}
            rows={rows}
            skippedSubtotals={skippedSubtotals}
            filter={filter}
            onFilter={setFilter}
            onEditChequeNumber={editChequeNumber}
            stale={stale}
          />
          <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:-mx-5 max-sm:border-t max-sm:bg-card max-sm:px-5 max-sm:py-3">
            <Button variant="outline" onClick={() => setStep('map')} disabled={commit.isPending}>
              <ArrowLeft /> Back
            </Button>
            {stale ? (
              <Button onClick={() => runPreview(rows)} loading={previewMutation.isPending}>
                <RefreshCw /> Re-check rows
              </Button>
            ) : (
              <Button variant="success" onClick={save} loading={commit.isPending} disabled={preview.ready === 0}>
                <CheckCircle2 /> Save {preview.ready} cheque{preview.ready === 1 ? '' : 's'}
              </Button>
            )}
          </DialogFooter>
        </>
      )}
    </>
  );
}

function FileStep({
  reading,
  error,
  fileName,
  sheets,
  sheetName,
  onSheet,
  fileInput,
  onFile,
  ready,
  onNext,
  onCancel,
}: {
  reading: boolean;
  error: string | null;
  fileName: string;
  sheets: string[];
  sheetName: string;
  onSheet: (name: string) => void;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  ready: boolean;
  onNext: () => void;
  onCancel: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          disabled={reading}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
          )}
        >
          {reading ? (
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-7 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {reading ? 'Reading…' : fileName || 'Choose or drop an .xlsx file'}
          </span>
          <span className="text-xs text-muted-foreground">
            Customer and supplier blocks side by side, like your CHEQUE FLOW sheet. Read on this device — nothing is
            uploaded until you save.
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {error && (
          <p className="flex items-start gap-2 rounded-md bg-destructive/[0.07] px-3 py-2 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        {sheets.length > 1 && (
          <div className="space-y-1.5">
            <Label>Sheet</Label>
            <Select value={sheetName} onValueChange={onSheet}>
              <SelectTrigger className="sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <RecentImports />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext} disabled={!ready || reading}>
          Next
        </Button>
      </DialogFooter>
    </>
  );
}

function BlockMapping({
  block,
  headers,
  onChange,
}: {
  block: ImportBlock;
  headers: string[];
  onChange: (block: ImportBlock) => void;
}) {
  const sideValue = block.direction ?? IGNORE;
  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border p-3',
        block.direction === 'RECEIVABLE' && 'border-success/40',
        block.direction === 'PAYABLE' && 'border-warning/40',
        !block.direction && 'border-dashed opacity-80',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{block.title}</p>
        <Select
          value={sideValue}
          onValueChange={(v) => onChange({ ...block, direction: v === IGNORE ? null : (v as ChequeFlowDirection) })}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RECEIVABLE">Customer cheques</SelectItem>
            <SelectItem value="PAYABLE">Supplier cheques</SelectItem>
            <SelectItem value={IGNORE}>Don&apos;t import</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {block.direction && (
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          {IMPORT_FIELDS.map((f) => {
            const col = block.mapping[f.key as ImportField];
            return (
              <div key={f.key} className="min-w-0 space-y-1">
                <Label className="text-xs">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={col === null ? NONE : String(col)}
                  onValueChange={(v) =>
                    onChange({ ...block, mapping: { ...block.mapping, [f.key]: v === NONE ? null : Number(v) } })
                  }
                >
                  <SelectTrigger className={cn('h-8 text-xs', f.required && col === null && 'border-destructive')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— not in sheet —</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {columnName(i)}
                        {h ? ` · ${h}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  preview,
  rows,
  skippedSubtotals,
  filter,
  onFilter,
  onEditChequeNumber,
  stale,
}: {
  preview: ChequeFlowImportPreview;
  rows: ChequeFlowImportRow[];
  skippedSubtotals: number;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onEditChequeNumber: (index: number, value: string) => void;
  stale: boolean;
}) {
  const shown = useMemo(
    () => preview.rows.filter((r) => filter === 'all' || r.result === filter),
    [preview.rows, filter],
  );
  const chips: { key: Filter; label: string; count: number; tone: string }[] = [
    { key: 'all', label: 'All', count: preview.rows.length, tone: '' },
    { key: 'ready', label: 'Ready', count: preview.ready, tone: 'text-success' },
    { key: 'duplicate', label: 'Duplicates (skipped)', count: preview.duplicates, tone: 'text-muted-foreground' },
    { key: 'error', label: 'Errors (skipped)', count: preview.errors, tone: 'text-destructive' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter(c.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === c.key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted',
            )}
          >
            <span className={c.tone}>{c.label}</span> <span className="tabular-nums">{c.count}</span>
          </button>
        ))}
      </div>
      {skippedSubtotals > 0 && (
        <p className="text-xs text-muted-foreground">
          {`${skippedSubtotals} month heading / subtotal row${skippedSubtotals === 1 ? ' was' : 's were'} left out — they aren't cheques.`}
        </p>
      )}
      {stale && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground dark:text-warning">
          You changed some cheque numbers — re-check the rows before saving.
        </p>
      )}
      <ul className="max-h-[55dvh] divide-y overflow-y-auto rounded-lg border border-border scrollbar-thin">
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing here.</li>}
        {shown.map((r) => {
          const raw = rows[r.index];
          const e = r.entry;
          return (
            <li
              key={r.index}
              className={cn(
                'grid gap-2 px-3 py-2.5 text-sm sm:grid-cols-[auto_1fr_auto]',
                r.result === 'error' && 'bg-destructive/[0.05]',
                r.result === 'duplicate' && 'bg-muted/50',
              )}
            >
              <div className="flex items-center gap-2 sm:w-28 sm:flex-col sm:items-start sm:gap-1">
                {r.result === 'ready' && (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3" /> Ready
                  </Badge>
                )}
                {r.result === 'duplicate' && (
                  <Badge variant="muted">
                    <Copy className="size-3" /> {r.duplicateOf === 'file' ? 'Twice in file' : 'Already saved'}
                  </Badge>
                )}
                {r.result === 'error' && (
                  <Badge variant="destructive">
                    <XCircle className="size-3" /> Error
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Row {r.sourceRow ?? '?'} · {SIDE_META[raw.direction].short}
                </span>
              </div>
              <div className="min-w-0">
                <p className="break-words font-medium">{e?.partyName ?? String(raw.partyName ?? '—')}</p>
                <p className="text-xs text-muted-foreground">
                  {e ? formatDay(e.chequeDate) : String(raw.chequeDate ?? '—')} ·{' '}
                  {e?.bankName ?? String(raw.bankName ?? '—')}
                  {e?.invoiceRef ? ` · ${e.invoiceRef}` : ''}
                  {e ? ` · ${STATUS_META[e.status].label}` : ''}
                  {e?.clearedDate ? ` ${formatDay(e.clearedDate)}` : ''}
                </p>
                {r.errors.map((m) => (
                  <p key={m} className="text-xs font-medium text-destructive">
                    {m}
                  </p>
                ))}
                {r.warnings.map((m) => (
                  <p key={m} className="flex items-center gap-1 text-xs text-warning-foreground dark:text-warning">
                    <AlertTriangle className="size-3" /> {m}
                  </p>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                <Input
                  aria-label={`Cheque number, row ${r.sourceRow ?? r.index + 1}`}
                  value={raw.chequeNumber === null || raw.chequeNumber === undefined ? '' : String(raw.chequeNumber)}
                  onChange={(ev) => onEditChequeNumber(r.index, ev.target.value)}
                  placeholder="Cheque no."
                  inputMode="numeric"
                  className="h-8 w-32 font-mono text-xs"
                />
                <span className="font-semibold tabular-nums">
                  {e ? formatCurrency(e.amount) : String(raw.amount ?? '—')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecentImports() {
  const { data: imports } = useChequeFlowImports(true);
  const undo = useUndoChequeFlowImport();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const target = imports?.find((i) => i.id === confirmId);
  if (!imports?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Recent imports</p>
      <ul className="divide-y rounded-lg border border-border">
        {imports.slice(0, 5).map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="min-w-0">
              <span className="block truncate font-medium">{i.fileName}</span>
              <span className="text-muted-foreground">
                {formatDateTime(i.createdAt)} · {i.inserted} added{i.skipped ? `, ${i.skipped} skipped` : ''}
              </span>
            </span>
            {i.undoneAt ? (
              <Badge variant="muted">Undone</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setConfirmId(i.id)}>
                <Undo2 /> Undo
              </Button>
            )}
          </li>
        ))}
      </ul>
      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this import?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the {target?.inserted} cheques added from &quot;{target?.fileName}&quot;. Cheques you added by
              hand are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              disabled={undo.isPending}
              onClick={() =>
                confirmId &&
                undo.mutate(confirmId, {
                  onSuccess: (r) => toast.success(`Import undone — ${r.removed} cheques removed`),
                  onError: (e) => toast.error(getErrorMessage(e)),
                })
              }
            >
              Undo import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
