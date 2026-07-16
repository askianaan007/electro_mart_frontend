'use client';

import { useEffect, useRef } from 'react';
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
import { useCreateDealer, useUpdateDealer } from '@/hooks/use-dealers';
import { getErrorMessage } from '@/lib/api/error';
import type { Dealer } from '@/lib/api/types';

const schema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]),
  address: z.string(),
  district: z.string(),
  username: z.string().min(1, 'Username is required'),
  creditLimit: z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, 'Enter a valid credit limit'),
  unlimitedCredit: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  resetPassword: z.boolean(),
  password: z.string(),
});

type FormValues = z.infer<typeof schema>;

function suggestUsername(businessName: string): string {
  return businessName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20);
}

function defaultValuesFor(dealer?: Dealer): FormValues {
  return {
    businessName: dealer?.businessName ?? '',
    ownerName: dealer?.ownerName ?? '',
    phone: dealer?.phone ?? '',
    email: dealer?.email ?? '',
    address: dealer?.address ?? '',
    district: dealer?.district ?? '',
    username: dealer?.username ?? '',
    creditLimit: dealer ? String(dealer.creditLimit) : '0',
    unlimitedCredit: dealer?.unlimitedCredit ?? false,
    status: dealer?.status ?? 'ACTIVE',
    resetPassword: false,
    password: '',
  };
}

export function DealerFormDialog({
  open,
  onOpenChange,
  dealer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealer?: Dealer;
  onCreated?: (result: { username: string; temporaryPassword: string }) => void;
}) {
  const isEdit = !!dealer;
  const createDealer = useCreateDealer();
  const updateDealer = useUpdateDealer(dealer?.id ?? '');
  const pending = createDealer.isPending || updateDealer.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(dealer),
  });

  const usernameTouched = useRef(isEdit);

  useEffect(() => {
    if (open) {
      form.reset(defaultValuesFor(dealer));
      usernameTouched.current = isEdit;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dealer]);

  const businessName = useWatch({ control: form.control, name: 'businessName' });

  useEffect(() => {
    if (isEdit || usernameTouched.current) return;
    form.setValue('username', suggestUsername(businessName), { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, isEdit]);

  const resetPassword = form.watch('resetPassword');
  const unlimitedCredit = form.watch('unlimitedCredit');

  const onSubmit = form.handleSubmit((values) => {
    const payload: Record<string, unknown> = {
      businessName: values.businessName,
      ownerName: values.ownerName,
      phone: values.phone,
      email: values.email || undefined,
      address: values.address || undefined,
      district: values.district || undefined,
      username: values.username,
      creditLimit: Number(values.creditLimit),
      unlimitedCredit: values.unlimitedCredit,
    };

    if (isEdit) {
      payload.status = values.status;
      if (values.resetPassword && values.password) payload.password = values.password;

      updateDealer.mutate(payload, {
        onSuccess: () => {
          toast.success('Dealer updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      if (values.resetPassword && values.password) payload.password = values.password;

      createDealer.mutate(payload, {
        onSuccess: (result) => {
          toast.success('Dealer created');
          onOpenChange(false);
          if (result.temporaryPassword) {
            onCreated?.({ username: values.username, temporaryPassword: result.temporaryPassword });
          }
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit dealer' : 'Add dealer'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit dealer' : 'Add a new dealer'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner name</FormLabel>
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
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          usernameTouched.current = true;
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    {!isEdit && (
                      <FormDescription>Auto-suggested from the business name — edit it if you&apos;d like something different.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit limit</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" disabled={unlimitedCredit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unlimitedCredit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div>
                      <FormLabel>Unlimited credit</FormLabel>
                      <FormDescription>Orders are never blocked by credit limit</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <FormField
                control={form.control}
                name="resetPassword"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <FormLabel>{isEdit ? 'Reset password' : 'Set a specific password'}</FormLabel>
                      <FormDescription>
                        {isEdit
                          ? 'Turn on to set a new password for this dealer'
                          : 'Leave off to auto-generate a temporary password'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {resetPassword && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Create dealer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
