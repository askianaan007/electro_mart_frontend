'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateRepresentative, useUpdateRepresentative } from '@/hooks/use-representatives';
import { getErrorMessage } from '@/lib/api/error';
import type { Representative } from '@/lib/api/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Enter a valid email'),
  address: z.string(),
  nicOrEmployeeId: z.string(),
  joiningDate: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED', 'INACTIVE']),
  setPassword: z.boolean(),
  password: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function defaultValuesFor(rep?: Representative): FormValues {
  return {
    name: rep?.name ?? '',
    phone: rep?.phone ?? '',
    email: rep?.email ?? '',
    address: rep?.address ?? '',
    nicOrEmployeeId: rep?.nicOrEmployeeId ?? '',
    joiningDate: toDateInputValue(rep?.joiningDate) || toDateInputValue(new Date().toISOString()),
    status: rep?.status ?? 'ACTIVE',
    setPassword: false,
    password: '',
  };
}

export function RepresentativeFormDialog({
  open,
  onOpenChange,
  representative,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative?: Representative;
  onCreated?: (result: { username: string; temporaryPassword: string }) => void;
}) {
  const isEdit = !!representative;
  const createRep = useCreateRepresentative();
  const updateRep = useUpdateRepresentative(representative?.id ?? '');
  const pending = createRep.isPending || updateRep.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(representative),
  });

  useEffect(() => {
    if (open) form.reset(defaultValuesFor(representative));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, representative]);

  const setPassword = useWatch({ control: form.control, name: 'setPassword' });

  const onSubmit = form.handleSubmit((values) => {
    const payload: Record<string, unknown> = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address || undefined,
      nicOrEmployeeId: values.nicOrEmployeeId || undefined,
      joiningDate: values.joiningDate || undefined,
    };

    if (isEdit) {
      payload.status = values.status;

      updateRep.mutate(payload, {
        onSuccess: () => {
          toast.success('Representative updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      if (values.setPassword && values.password) payload.password = values.password;

      createRep.mutate(payload, {
        onSuccess: (result) => {
          toast.success('Representative created');
          onOpenChange(false);
          if (result.temporaryPassword) {
            onCreated?.({ username: values.email, temporaryPassword: result.temporaryPassword });
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit representative' : 'Add representative'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit representative' : 'Add a new representative'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormDescription>Also becomes the login username.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nicOrEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIC / Employee ID (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="joiningDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joining date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEdit && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="BLOCKED">Blocked</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!isEdit && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <FormField
                  control={form.control}
                  name="setPassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-2">
                      <div>
                        <FormLabel>Set a specific password</FormLabel>
                        <FormDescription>Leave off to auto-generate a temporary password</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {setPassword && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Use &quot;Reset password&quot; from the representative&apos;s detail page to change their password.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Create representative'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
