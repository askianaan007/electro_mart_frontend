'use client';

import { useEffect, useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useChequeFlowOptions, useCreateChequeFlow, useUpdateChequeFlow } from '@/hooks/use-cheque-flow';
import { getErrorMessage } from '@/lib/api/error';
import { ApiError } from '@/lib/api/client';
import { SIDE_META, STATUS_META, STATUS_ORDER } from '@/lib/cheque-flow';
import { businessToday, cn } from '@/lib/utils';
import type { ChequeFlowDirection, ChequeFlowEntry, ChequeFlowStatus } from '@/lib/api/types';

const schema = z
  .object({
    direction: z.enum(['RECEIVABLE', 'PAYABLE']),
    chequeNumber: z.string().max(40, 'At most 40 characters'),
    bankName: z.string().trim().min(1, 'Enter the bank').max(80, 'At most 80 characters'),
    chequeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the cheque date'),
    partyName: z.string().trim().min(1, 'Enter the name').max(120, 'At most 120 characters'),
    invoiceRef: z.string().max(120, 'At most 120 characters'),
    amount: z
      .string()
      .refine((v) => v.trim() !== '' && Number(v) > 0, 'Enter an amount above 0')
      .refine((v) => /^\d*(\.\d{0,2})?$/.test(v.trim()), 'At most 2 decimal places')
      .refine((v) => Number(v) <= 1_000_000_000, 'Amount cannot exceed 1,000,000,000'),
    status: z.enum(['PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED']),
    clearedDate: z.string(),
    remarks: z.string().max(500, 'At most 500 characters'),
  })
  .superRefine((v, ctx) => {
    if (v.status !== 'CLEARED') return;
    if (!v.clearedDate) {
      ctx.addIssue({ code: 'custom', path: ['clearedDate'], message: 'Enter the day the bank cleared it' });
    } else if (v.clearedDate > businessToday()) {
      ctx.addIssue({ code: 'custom', path: ['clearedDate'], message: "Can't be in the future" });
    } else if (v.chequeDate && v.clearedDate < v.chequeDate) {
      ctx.addIssue({ code: 'custom', path: ['clearedDate'], message: "Can't be before the cheque date" });
    }
  });

type FormValues = z.infer<typeof schema>;

function defaults(
  entry?: ChequeFlowEntry | null,
  direction: ChequeFlowDirection = 'RECEIVABLE',
  month?: string | null,
): FormValues {
  // A new cheque defaults to today, or the 1st of the month being viewed when that isn't this month.
  const today = businessToday();
  const date = !month || today.startsWith(month) ? today : `${month}-01`;
  return {
    direction: entry?.direction ?? direction,
    chequeNumber: entry?.chequeNumber ?? '',
    bankName: entry?.bankName ?? '',
    chequeDate: entry?.chequeDate ?? date,
    partyName: entry?.partyName ?? '',
    invoiceRef: entry?.invoiceRef ?? '',
    amount: entry ? String(entry.amount) : '',
    status: entry?.status ?? 'PENDING',
    clearedDate: entry?.clearedDate ?? '',
    remarks: entry?.remarks ?? '',
  };
}

export function ChequeFormDialog({
  open,
  onOpenChange,
  entry,
  direction,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing this cheque; omit to add one. */
  entry?: ChequeFlowEntry | null;
  /** Side for a new cheque. */
  direction?: ChequeFlowDirection;
  /** The month being viewed, used for a new cheque's default date. */
  month?: string | null;
}) {
  const isEdit = !!entry;
  const create = useCreateChequeFlow();
  const update = useUpdateChequeFlow();
  const { data: options } = useChequeFlowOptions();
  const pending = create.isPending || update.isPending;
  const listId = useId();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(entry, direction, month) });

  useEffect(() => {
    if (open) form.reset(defaults(entry, direction, month));
  }, [open, entry, direction, month, form]);

  const side = form.watch('direction');
  const status = form.watch('status');
  const meta = SIDE_META[side];
  const names = side === 'RECEIVABLE' ? options?.customerSuggestions : options?.supplierSuggestions;

  const onSubmit = form.handleSubmit((v) => {
    const payload = {
      direction: v.direction,
      chequeNumber: v.chequeNumber.trim() || undefined,
      bankName: v.bankName.trim(),
      chequeDate: v.chequeDate,
      partyName: v.partyName.trim(),
      invoiceRef: v.invoiceRef.trim() || undefined,
      amount: Number(v.amount),
      status: v.status,
      clearedDate: v.status === 'CLEARED' ? v.clearedDate : undefined,
      remarks: v.remarks.trim() || undefined,
    };
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? 'Cheque updated' : `${meta.short} cheque added`);
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        // A duplicate cheque number is shown on the field itself.
        if (error instanceof ApiError && error.statusCode === 409) {
          form.setError('chequeNumber', { message: error.message });
          return;
        }
        toast.error(getErrorMessage(error));
      },
    };
    if (entry) {
      // Sending '' clears an optional field that was emptied.
      update.mutate(
        {
          id: entry.id,
          ...payload,
          chequeNumber: v.chequeNumber.trim(),
          invoiceRef: v.invoiceRef.trim(),
          remarks: v.remarks.trim(),
        },
        done,
      );
    } else {
      create.mutate(payload, done);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent title={isEdit ? 'Edit cheque' : 'Add cheque'} mobileFullScreen className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit cheque' : 'Add a cheque'}</DialogTitle>
          <DialogDescription>
            For planning only — this doesn&apos;t record a payment or change any balance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cheque type</FormLabel>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {(['RECEIVABLE', 'PAYABLE'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={field.value === d}
                        onClick={() => field.onChange(d)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                          field.value === d
                            ? d === 'RECEIVABLE'
                              ? 'border-success bg-success/10 text-success'
                              : 'border-warning bg-warning/10 text-warning-foreground dark:text-warning'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {d === 'RECEIVABLE' ? (
                          <ArrowDownLeft className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                        <span>
                          {SIDE_META[d].short}
                          <span className="block text-xs font-normal opacity-80">{SIDE_META[d].verb}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="chequeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque no.</FormLabel>
                    <FormControl>
                      {/* Text, so 000718 keeps its zeros. */}
                      <Input inputMode="numeric" autoComplete="off" placeholder="e.g. 000718" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <FormControl>
                      <Input list={`${listId}-banks`} autoComplete="off" placeholder="e.g. BOC" {...field} />
                    </FormControl>
                    <datalist id={`${listId}-banks`}>
                      {options?.banks.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partyName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{meta.party} name</FormLabel>
                    <FormControl>
                      <Input list={`${listId}-names`} autoComplete="off" {...field} />
                    </FormControl>
                    <datalist id={`${listId}-names`}>
                      {names?.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chequeDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cheque date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0.01}
                        step="0.01"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice ref (optional)</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" placeholder="e.g. INV-2026-00046" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v === 'CLEARED' && !form.getValues('clearedDate')) {
                          const date = form.getValues('chequeDate');
                          const today = businessToday();
                          form.setValue('clearedDate', date && date < today ? date : today);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_ORDER.map((s: ChequeFlowStatus) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {status === 'CLEARED' && (
                <FormField
                  control={form.control}
                  name="clearedDate"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Actual cleared date</FormLabel>
                      <FormControl>
                        <Input type="date" max={businessToday()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:-mx-5 max-sm:border-t max-sm:bg-card max-sm:px-5 max-sm:py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Add cheque'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
