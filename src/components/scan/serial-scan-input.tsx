'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Camera, ClipboardList, Loader2, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CameraScanDialog } from '@/components/scan/camera-scan-dialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useValidateSerials } from '@/hooks/use-product-units';
import type { SerialContext, SerialVerdict, SerialVerdictCode } from '@/lib/api/types';
import { cleanSerial, parseSerialList, scanBeep, serialFormatProblem, serialKey, SERIAL_LIST_MAX } from '@/lib/serial';
import { cn } from '@/lib/utils';

export interface SerialScanState {
  /** Every serial passed the server check for this context. */
  ok: boolean;
  /** A check is still running — don't submit yet. */
  pending: boolean;
  /** Serials the server rejected, with why. */
  problems: SerialVerdict[];
}

/**
 * Scan box for a list of serials of ONE product. A USB/Bluetooth scanner
 * types the code and presses Enter, so each scan lands as one chip; a list
 * can also be pasted. Every chip is checked live against the server for the
 * given context (receive, assign to order, return, write-off) — read-only,
 * nothing is saved until the parent form submits.
 */
export function SerialScanInput({
  productId,
  context,
  orderId,
  purchaseId,
  value,
  onChange,
  max,
  disabled,
  autoFocus,
  onStateChange,
  accepted,
  reject,
  placeholder = 'Scan or type a serial, then Enter',
}: {
  productId: string;
  context: SerialContext;
  orderId?: string;
  purchaseId?: string;
  value: string[];
  onChange: (next: string[]) => void;
  /** Most serials this list may hold (e.g. the line quantity). */
  max?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onStateChange?: (state: SerialScanState) => void;
  /** Serials already on the record being edited — shown as fine whatever the server says. */
  accepted?: { serials: string[]; message: string };
  /** Verdicts the server allows in general but this screen doesn't, with the message to show. */
  reject?: Partial<Record<SerialVerdictCode, string>>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAdded = useRef<string | null>(null);

  const debounced = useDebouncedValue(value, 250);
  const validation = useValidateSerials(
    productId && debounced.length > 0 ? { productId, serials: debounced, context, orderId, purchaseId } : null,
  );
  const settled = debounced === value && !validation.isFetching;

  const verdictByKey = useMemo(() => {
    const map = new Map<string, SerialVerdict>();
    if (!validation.data || debounced !== value) return map;
    const acceptedKeys = new Set((accepted?.serials ?? []).map(serialKey));
    for (const verdict of validation.data) {
      const key = serialKey(verdict.input);
      const rejected = reject?.[verdict.code];
      map.set(
        key,
        acceptedKeys.has(key) && !verdict.ok
          ? { ...verdict, ok: true, code: 'OK', message: accepted!.message }
          : rejected
            ? { ...verdict, ok: false, message: rejected }
            : verdict,
      );
    }
    return map;
  }, [validation.data, debounced, value, accepted, reject]);

  const problems = useMemo(() => [...verdictByKey.values()].filter((v) => !v.ok), [verdictByKey]);
  const overMax = max !== undefined && value.length > max;
  const full = max !== undefined && value.length >= max;
  const ok = value.length === 0 || (settled && !validation.isError && problems.length === 0 && !overMax);
  const pending = value.length > 0 && !settled;

  // Report up only when something meaningful changed.
  const stateKey = `${ok}|${pending}|${problems.map((p) => p.input).join(',')}`;
  const report = useEffectEvent(() => onStateChange?.({ ok, pending, problems }));
  useEffect(() => {
    report();
  }, [stateKey]);

  // Beep once the server has judged the serial just scanned.
  useEffect(() => {
    if (!lastAdded.current) return;
    const verdict = verdictByKey.get(lastAdded.current);
    if (verdict) {
      scanBeep(verdict.ok);
      lastAdded.current = null;
    }
  }, [verdictByKey]);

  /** Adds what passes the local checks; returns the new list length. */
  function addMany(raws: string[]): number {
    const keys = new Set(value.map(serialKey));
    const next = [...value];
    const skipped: string[] = [];
    for (const raw of raws) {
      const shown = cleanSerial(raw);
      if (!shown) continue;
      const problem = serialFormatProblem(shown);
      if (problem) {
        skipped.push(`${shown}: ${problem}`);
        continue;
      }
      const key = serialKey(shown);
      if (keys.has(key)) {
        skipped.push(`${shown}: already in the list`);
        continue;
      }
      if (next.length >= SERIAL_LIST_MAX) {
        skipped.push(`${shown}: list is full (${SERIAL_LIST_MAX})`);
        continue;
      }
      if (max !== undefined && next.length >= max) {
        skipped.push(`${shown}: only ${max} needed`);
        continue;
      }
      keys.add(key);
      next.push(shown);
      lastAdded.current = key;
    }
    if (skipped.length > 0) {
      setLocalError(skipped.slice(0, 3).join(' · ') + (skipped.length > 3 ? ` · +${skipped.length - 3} more` : ''));
      scanBeep(false);
    } else {
      setLocalError(null);
    }
    if (next.length !== value.length) onChange(next);
    return next.length;
  }

  function submitDraft() {
    if (!draft.trim()) return;
    addMany([draft]);
    setDraft('');
    inputRef.current?.focus();
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={draft}
            disabled={disabled || full}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            placeholder={full ? 'All serials scanned' : placeholder}
            className="pl-8 font-mono"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Scanners end with Enter (sometimes Tab); never submit the outer form.
              if (e.key === 'Enter' || (e.key === 'Tab' && draft.trim())) {
                e.preventDefault();
                submitDraft();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || full}
          onClick={() => setCameraOpen(true)}
          title="Scan with the phone camera"
        >
          <Camera />
          <span className="hidden sm:inline">Camera</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setPasteOpen((o) => !o)}
          title="Paste a list of serials"
        >
          <ClipboardList />
          <span className="hidden sm:inline">Paste list</span>
        </Button>
      </div>

      {pasteOpen && (
        <div className="space-y-2 rounded-md border border-dashed border-border p-2">
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'One serial per line (or separated by commas)'}
            className="min-h-24 font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPasteOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!pasteText.trim()}
              onClick={() => {
                addMany(parseSerialList(pasteText));
                setPasteText('');
                setPasteOpen(false);
              }}
            >
              Add {parseSerialList(pasteText).length || ''} serial(s)
            </Button>
          </div>
        </div>
      )}

      {cameraOpen && (
        <CameraScanDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          mode="multi"
          title="Scan serials with camera"
          description={
            max !== undefined
              ? `Scan each unit's S/N label — ${value.length} of ${max} done.`
              : "Scan each unit's S/N label one after another."
          }
          ignore={value}
          onDetect={(code) => {
            // Close by itself once every unit has a serial.
            if (max !== undefined && addMany([code]) >= max) setCameraOpen(false);
          }}
        />
      )}

      {localError && <p className="text-xs text-destructive">{localError}</p>}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={cn(overMax && 'text-destructive')}>
          {value.length}
          {max !== undefined ? ` / ${max}` : ''} scanned
        </span>
        <span className="flex items-center gap-2">
          {pending && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> checking…
            </span>
          )}
          {validation.isError && (
            <span className="text-destructive">Couldn&apos;t check serials — retrying on change</span>
          )}
          {value.length > 0 && !disabled && (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => onChange([])}>
              Clear all
            </button>
          )}
        </span>
      </div>

      {value.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
          {value.map((serial, index) => {
            const verdict = verdictByKey.get(serialKey(serial));
            const tone = !verdict
              ? 'border-border'
              : !verdict.ok
                ? 'border-destructive/40 bg-destructive/5'
                : verdict.code === 'NEW_WILL_REGISTER'
                  ? 'border-warning/40 bg-warning/5'
                  : 'border-success/30 bg-success/5';
            return (
              <li
                key={`${serial}-${index}`}
                className={cn('flex items-center justify-between gap-2 rounded-md border px-2 py-1', tone)}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-foreground">{serial}</p>
                  {verdict && (
                    <p
                      className={cn('truncate text-[11px]', verdict.ok ? 'text-muted-foreground' : 'text-destructive')}
                    >
                      {verdict.message}
                    </p>
                  )}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${serial}`}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
