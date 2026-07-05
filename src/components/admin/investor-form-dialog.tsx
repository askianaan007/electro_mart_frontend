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
import { useCreateInvestor, useUpdateInvestor } from '@/hooks/use-investors';
import { getErrorMessage } from '@/lib/api/error';
import type { Investor } from '@/lib/api/types';

const schema = z.object({
  name: z.string().min(1, 'Investor name is required'),
  phone: z.string(),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  profitSharePercentage: z
    .string()
    .refine((v) => v !== '' && Number(v) >= 0 && Number(v) <= 100, 'Enter a percentage between 0 and 100'),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(investor?: Investor): FormValues {
  return {
    name: investor?.name ?? '',
    phone: investor?.phone ?? '',
    email: investor?.email ?? '',
    profitSharePercentage: investor ? String(investor.profitSharePercentage) : '',
  };
}

export function InvestorFormDialog({
  open,
  onOpenChange,
  investor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investor?: Investor;
}) {
  const isEdit = !!investor;
  const createInvestor = useCreateInvestor();
  const updateInvestor = useUpdateInvestor(investor?.id ?? '');
  const pending = createInvestor.isPending || updateInvestor.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(investor),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(investor));
  }, [open, investor, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      profitSharePercentage: Number(values.profitSharePercentage),
    };

    const mutation = isEdit ? updateInvestor : createInvestor;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Investor updated' : 'Investor added');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit investor' : 'Add investor'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit investor' : 'Add a new investor'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investor name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="profitSharePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profit share (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Add investor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
