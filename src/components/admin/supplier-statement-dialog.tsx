'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Supplier } from '@/lib/api/types';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function SupplierStatementDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}) {
  const router = useRouter();
  const [fromMonth, setFromMonth] = useState(currentMonth());
  const [toMonth, setToMonth] = useState(currentMonth());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromMonth(currentMonth());
      setToMonth(currentMonth());
      setError(null);
    }
  }, [open]);

  function handleGenerate() {
    if (!supplier) return;
    if (!fromMonth || !toMonth) {
      setError('Select both a from and to month');
      return;
    }
    if (fromMonth > toMonth) {
      setError('From month must be before or the same as the to month');
      return;
    }
    onOpenChange(false);
    router.push(`/admin/suppliers/${supplier.id}/statement?from=${fromMonth}&to=${toMonth}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Generate supplier statement">
        <DialogHeader>
          <DialogTitle>Generate Statement</DialogTitle>
          <DialogDescription>
            {supplier
              ? `Choose the period to include for ${supplier.name} — purchases, transport charges, returns, and settlements in that range.`
              : 'Choose a period to generate a printable statement.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="statement-from">From</Label>
            <input
              id="statement-from"
              type="month"
              value={fromMonth}
              max={toMonth || undefined}
              onChange={(e) => setFromMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>
            <FileText />
            Generate Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
