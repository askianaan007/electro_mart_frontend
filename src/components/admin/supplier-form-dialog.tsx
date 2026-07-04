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
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers';
import { getErrorMessage } from '@/lib/api/error';
import type { Supplier } from '@/lib/api/types';

const schema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contact: z.string(),
  phone: z.string(),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  address: z.string(),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(supplier?: Supplier): FormValues {
  return {
    name: supplier?.name ?? '',
    contact: supplier?.contact ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
  };
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}) {
  const isEdit = !!supplier;
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier(supplier?.id ?? '');
  const pending = createSupplier.isPending || updateSupplier.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(supplier),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(supplier));
  }, [open, supplier, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      name: values.name,
      contact: values.contact || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
    };

    const mutation = isEdit ? updateSupplier : createSupplier;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Supplier updated' : 'Supplier created');
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit supplier' : 'Add supplier'}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier' : 'Add a new supplier'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact person (optional)</FormLabel>
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                {isEdit ? 'Save changes' : 'Create supplier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
