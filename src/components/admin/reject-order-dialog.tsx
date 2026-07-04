'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRejectOrder } from '@/hooks/use-orders';
import { getErrorMessage } from '@/lib/api/error';

const schema = z.object({ reason: z.string().min(3, 'Please provide a short reason') });

export function RejectOrderDialog({
  open,
  onOpenChange,
  orderId,
  onRejected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onRejected?: () => void;
}) {
  const rejectOrder = useRejectOrder();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    rejectOrder.mutate(
      { id: orderId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success('Order rejected');
          form.reset();
          onOpenChange(false);
          onRejected?.();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Reject order">
        <DialogHeader>
          <DialogTitle>Reject this order</DialogTitle>
          <DialogDescription>The dealer will be notified with this reason.</DialogDescription>
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
                    <Textarea rows={3} placeholder="e.g. Insufficient stock available" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={rejectOrder.isPending}>
                Reject order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
