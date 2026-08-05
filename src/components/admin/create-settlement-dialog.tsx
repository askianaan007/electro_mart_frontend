'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllRepresentatives } from '@/hooks/use-representatives';
import { useCreateSettlement } from '@/hooks/use-commission';
import { getErrorMessage } from '@/lib/api/error';

const schema = z.object({
  representativeId: z.string().min(1, 'Select a representative'),
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
});

type FormValues = z.infer<typeof schema>;

export function CreateSettlementDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (settlementId: string) => void;
}) {
  const { data: representatives } = useAllRepresentatives();
  const createSettlement = useCreateSettlement();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { representativeId: '', periodStart: '', periodEnd: '' },
  });

  useEffect(() => {
    if (open) form.reset({ representativeId: '', periodStart: '', periodEnd: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = form.handleSubmit((values) => {
    createSettlement.mutate(values, {
      onSuccess: (settlement) => {
        toast.success(`Settlement ${settlement.settlementNumber} created`);
        onOpenChange(false);
        onCreated?.(settlement.id);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create settlement">
        <DialogHeader>
          <DialogTitle>Create a commission settlement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="representativeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representative</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a representative" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {representatives?.data.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period end</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Batches every pending commission line for this representative created within the period into a new
              settlement.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createSettlement.isPending}>
                Create settlement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
