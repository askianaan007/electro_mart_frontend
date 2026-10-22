'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Barcode, Camera, History, Loader2, PackageSearch, ScanLine, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { CameraScanDialog } from '@/components/scan/camera-scan-dialog';
import { UnitStatusBadge } from '@/components/scan/unit-status-badge';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useScanCode } from '@/hooks/use-product-units';
import { getErrorMessage } from '@/lib/api/error';
import type { SerialScanResult } from '@/lib/api/types';
import { cleanSerial, scanBeep } from '@/lib/serial';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'electromart-recent-scans';

interface RecentScan {
  code: string;
  label: string;
  href: string | null;
  at: number;
}

// Per-browser list of recent scans (a convenience only — storage may be unavailable).
const RECENT_EVENT = 'electromart-recent-scans-changed';

function readRecentRaw(): string {
  try {
    return window.localStorage.getItem(RECENT_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

function parseRecent(raw: string): RecentScan[] {
  try {
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as RecentScan[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: RecentScan[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    // Remembering scans is a convenience only.
  }
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function subscribeRecent(onChange: () => void) {
  window.addEventListener(RECENT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(RECENT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

const TONE: Record<string, string> = {
  success: 'border-success/30 bg-success/5',
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/40 bg-warning/10',
  purple: 'border-purple/30 bg-purple/5',
  muted: 'border-border bg-muted/40',
};

export default function ScanPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<SerialScanResult | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const recentRaw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => '[]');
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scan = useScanCode();

  function remember(entry: Omit<RecentScan, 'at'>) {
    writeRecent([{ ...entry, at: Date.now() }, ...parseRecent(readRecentRaw()).filter((r) => r.code !== entry.code)]);
  }

  function lookup(raw: string) {
    const value = cleanSerial(raw);
    if (!value) return;
    setCode('');
    scan.mutate(value, {
      onSuccess: (data) => {
        setResult(data);
        if (data.kind === 'UNIT' && data.units.length === 1) {
          const unit = data.units[0];
          scanBeep(true);
          remember({
            code: value,
            label: `${unit.product.name} · ${unit.statusSummary.headline}`,
            href: `/admin/units/${unit.id}`,
          });
          router.push(`/admin/units/${unit.id}`);
          return;
        }
        if (data.kind === 'UNIT') {
          scanBeep(true);
          remember({ code: value, label: `${data.units.length} products share this serial`, href: null });
        } else if (data.kind === 'PRODUCT') {
          scanBeep(false);
          remember({ code: value, label: `Model barcode — ${data.product?.name ?? 'product'}`, href: null });
        } else {
          scanBeep(false);
          remember({ code: value, label: 'Not registered', href: null });
        }
        inputRef.current?.focus();
      },
      onError: (error) => {
        scanBeep(false);
        toast.error(getErrorMessage(error));
      },
    });
  }

  // Scans land here even when the box isn't focused.
  useBarcodeScanner(lookup, { enabled: !cameraOpen });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan a unit"
        description="Scan a serial number to open its full history — sale, warranty, customer and supplier returns."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/units">
              <Barcode />
              All serial units
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              lookup(code);
            }}
          >
            <div className="relative flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Scan or type a serial number"
                autoComplete="off"
                spellCheck={false}
                className="h-12 pl-10 font-mono text-base"
              />
            </div>
            <Button type="submit" className="h-12 sm:w-32" disabled={!code.trim() || scan.isPending}>
              {scan.isPending ? <Loader2 className="animate-spin" /> : 'Look up'}
            </Button>
            <Button type="button" variant="outline" className="h-12 sm:w-36" onClick={() => setCameraOpen(true)}>
              <Camera />
              Camera
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            On a phone, tap Camera and point it at the S/N label. A USB or Bluetooth scanner works anywhere on this page
            — no need to click the box first.
          </p>
        </CardContent>
      </Card>

      {cameraOpen && (
        <CameraScanDialog open={cameraOpen} onOpenChange={setCameraOpen} mode="single" onDetect={lookup} />
      )}

      {result?.kind === 'UNIT' && result.units.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.units.length} products use serial {result.code}
            </CardTitle>
            <CardDescription>Different brands sometimes print the same serial. Pick the right product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.units.map((unit) => (
              <Link
                key={unit.id}
                href={`/admin/units/${unit.id}`}
                className={cn('block rounded-lg border p-3 hover:border-primary/40', TONE[unit.statusSummary.tone])}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{unit.product.name}</p>
                  <UnitStatusBadge status={unit.status} condition={unit.condition} />
                </div>
                <p className="mt-1 text-sm text-foreground">{unit.statusSummary.headline}</p>
                <p className="text-xs text-muted-foreground">{unit.statusSummary.subline}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {result?.kind === 'PRODUCT' && (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 p-4 sm:p-6">
            <PackageSearch className="mt-0.5 size-5 shrink-0 text-warning-foreground dark:text-warning" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                That&apos;s the model barcode of &ldquo;{result.product?.name}&rdquo;, not a unit serial
              </p>
              <p className="text-sm text-muted-foreground">
                Every box of this model carries the same code. Scan the label marked S/N or Serial instead.
                {result.product && ` ${result.product.currentStock} in stock.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.kind === 'NONE' && (
        <Card>
          <CardContent className="flex items-start gap-3 p-4 sm:p-6">
            <SearchX className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">No unit with serial {result.code}</p>
              <p className="text-sm text-muted-foreground">
                It was never registered. Units get serials when a purchase is received, when an order is packed, or from
                &ldquo;Add serials&rdquo; on the purchase or the serial units page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {recent.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" /> Recent scans
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                writeRecent([]);
              }}
            >
              Clear
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <ul className="divide-y divide-border border-t border-border">
              {recent.map((entry) => (
                <li key={`${entry.code}-${entry.at}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/50 sm:px-6"
                    onClick={() => (entry.href ? router.push(entry.href) : lookup(entry.code))}
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-sm text-foreground">{entry.code}</span>
                      <span className="block truncate text-xs text-muted-foreground">{entry.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
