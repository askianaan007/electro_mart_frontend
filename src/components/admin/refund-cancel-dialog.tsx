'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCancelRefund } from '@/hooks/use-refunds';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency } from '@/lib/utils';
import type { Refund } from '@/lib/api/types';

const schema = z.object({ reason: z.string().trim().min(3, 'Please give a short reason') });

/** Cancels a refund — the record stays, and Liquid Cash gets a dated correction. */
export function RefundCancelDialog({ refund, onClose }: { refund: Refund | null; onClose: () => void }) {
  const cancelRefund = useCancelRefund();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (refund) form.reset({ reason: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refund?.id]);

  const partyName = refund?.dealer?.businessName ?? refund?.supplier?.name ?? 'the party';

  const onSubmit = form.handleSubmit((values) => {
    if (!refund) return;
    cancelRefund.mutate(
      { id: refund.id, reason: values.reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Refund ${refund.refundNumber} cancelled — credit restored`);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={!!refund} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Cancel refund">
        <DialogHeader>
          <DialogTitle>Cancel refund {refund?.refundNumber}?</DialogTitle>
          <DialogDescription>
            This restores {partyName}&apos;s credit of {refund ? formatCurrency(refund.amount) : ''} and is recorded
            as a dated correction in Liquid Cash — the original entry stays in the history. You can restore it later
            if this was a mistake.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Keep refund
              </Button>
              <Button type="submit" variant="destructive" loading={cancelRefund.isPending}>
                Cancel refund
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
