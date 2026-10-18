'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrint } from '@/hooks/use-print';

/** The Print action for invoice/statement pages: waits for the document to be ready, shows progress, reports failures. */
export function PrintButton({
  variant = 'outline',
  disabled,
  label = 'Print',
}: {
  variant?: 'default' | 'outline';
  disabled?: boolean;
  label?: string;
}) {
  const { print, isPrinting } = usePrint();
  return (
    <Button variant={variant} onClick={print} loading={isPrinting} disabled={disabled} aria-busy={isPrinting}>
      {!isPrinting && <Printer />}
      {isPrinting ? 'Preparing…' : label}
    </Button>
  );
}
