'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, FileDown, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/endpoints';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { getErrorMessage } from '@/lib/api/error';
import { buildSupplierStatement, type StatementPeriod } from '@/lib/supplier-statement';
import { downloadSupplierStatementPdf, money } from '@/lib/supplier-statement-pdf';
import { cn } from '@/lib/utils';
import type { Supplier } from '@/lib/api/types';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Scope = 'all' | 'range';

/**
 * Generates the A4 Statement of Account PDF for one supplier — the whole
 * account, or a month / month range (with the balance brought forward).
 * Always loads the supplier's full history so the opening balance is exact,
 * and cross-checks the all-time closing balance against the system's
 * supplier credit balance before handing over the file.
 */
export function SupplierStatementDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Pick<Supplier, 'id' | 'name'> | null;
}) {
  const [scope, setScope] = useState<Scope>('range');
  const [fromMonth, setFromMonth] = useState(currentMonth());
  const [toMonth, setToMonth] = useState(currentMonth());
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScope('range');
      setFromMonth(currentMonth());
      setToMonth(currentMonth());
      setError(null);
    }
  }, [open]);

  async function handleGenerate() {
    if (!supplier) return;
    setError(null);
    if (scope === 'range') {
      if (!fromMonth || !toMonth) {
        setError('Select both a from and to month');
        return;
      }
      if (fromMonth > toMonth) {
        setError('From month must be before or the same as the to month');
        return;
      }
    }
    const period: StatementPeriod = scope === 'all' ? { kind: 'all' } : { kind: 'range', fromMonth, toMonth };

    setGenerating(true);
    try {
      const supplierId = supplier.id;
      const [purchases, returns, replacements, payments, credit] = await Promise.all([
        fetchAllPages((page, limit) => api.purchases.list({ supplierId, page, limit })),
        fetchAllPages((page, limit) => api.purchaseReturns.list({ supplierId, page, limit })),
        fetchAllPages((page, limit) => api.replacementReceipts.list({ supplierId, page, limit })),
        fetchAllPages((page, limit) => api.credits.settlements(supplierId, { page, limit })),
        api.credits.detail(supplierId),
      ]);

      const statement = buildSupplierStatement({ purchases, returns, replacements, payments }, period);

      // Same rules as the backend's supplierBalance(); if they ever disagree
      // the statement must not go out silently.
      const systemBalance = Number(credit.creditBalance);
      if (Math.abs(statement.allTimeBalance - systemBalance) > 0.01) {
        toast.warning(
          `Statement balance ${money(statement.allTimeBalance)} differs from the system balance ${money(systemBalance)} — please check before sending.`,
          { duration: 10000 },
        );
      }

      await downloadSupplierStatementPdf(supplier.name, statement);
      toast.success('Statement PDF downloaded');
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  const options: { value: Scope; label: string; hint: string; icon: typeof CalendarRange }[] = [
    { value: 'range', label: 'Month / period', hint: 'One month or a range, with balance brought forward', icon: CalendarRange },
    { value: 'all', label: 'Whole account', hint: 'Every transaction since the first purchase', icon: InfinityIcon },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !generating && onOpenChange(o)}>
      <DialogContent title="Supplier statement of account" className="max-h-[calc(100dvh-2rem)]">
        <DialogHeader>
          <DialogTitle>Statement of Account</DialogTitle>
          <DialogDescription>
            {supplier
              ? `A4 PDF for ${supplier.name}: account summary, monthly movement and the full ledger with running balance.`
              : 'Choose a period to generate the statement.'}
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Statement period" className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const selected = scope === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setScope(option.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {scope === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="statement-from">From</Label>
              <input
                id="statement-from"
                type="month"
                value={fromMonth}
                max={toMonth || undefined}
                onChange={(e) => setFromMonth(e.target.value)}
                className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statement-to">To</Label>
              <input
                id="statement-to"
                type="month"
                value={toMonth}
                min={fromMonth || undefined}
                max={currentMonth()}
                onChange={(e) => setToMonth(e.target.value)}
                className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} loading={generating}>
            <FileDown />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
