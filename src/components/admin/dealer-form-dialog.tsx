'use client';

import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
  UserPlus,
} from 'lucide-react';
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
          toast.success('Dealer account updated successfully');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      if (values.resetPassword && values.password) payload.password = values.password;

      createDealer.mutate(payload, {
        onSuccess: (result) => {
          toast.success('Dealer account registered successfully');
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
      <DialogContent
        title={isEdit ? 'Edit dealer profile' : 'Register new dealer'}
        className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isEdit ? <Pencil className="size-4" /> : <UserPlus className="size-4" />}
            </div>
            <DialogTitle>
              {isEdit ? 'Edit Dealer Profile' : 'Register New Dealer Account'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEdit
              ? 'Update business details, contact information, and allocated credit terms'
              : 'Add an authorized dealer to the platform with custom credit limits and login credentials'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Form Content */}
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form id="dealer-form" onSubmit={onSubmit} className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Business &amp; contact</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="e.g. Apex Electronics Ltd"
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="e.g. John Doe"
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="+1 (555) 000-0000"
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="dealer@company.com"
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>Business Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Street address..."
                            className="pl-9"
                            {...field}
                          />
                        </div>
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
                      <FormLabel>District / Region</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Central District"
                                                    {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
              </section>

              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Login &amp; credit</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="username"
                          className="font-medium"
                          {...field}
                          onChange={(e) => {
                            usernameTouched.current = true;
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      {!isEdit && (
                        <FormDescription className="text-xs">
                          Auto-suggested from business name
                        </FormDescription>
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
                      <FormLabel>Allocated Credit Limit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={unlimitedCredit}
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Credit Options & Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="unlimitedCredit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">
                          Unlimited Credit Access
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Bypasses credit evaluation checks
                        </FormDescription>
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
                      <FormItem className="rounded-lg border border-border p-3">
                        <FormLabel>Account Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active Account</SelectItem>
                            <SelectItem value="INACTIVE">Inactive Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
              </section>

              {/* Password Management */}
              <section className="space-y-3 border-t border-border pt-5">
                <h3 className="text-sm font-semibold">Password</h3>
              <div className="space-y-3 rounded-lg border border-border p-3">
                <FormField
                  control={form.control}
                  name="resetPassword"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <FormLabel className="cursor-pointer">
                          {isEdit ? 'Set Custom Password' : 'Specify Initial Password'}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {isEdit
                            ? 'Enable to manually override the dealer password'
                            : 'Leave off to auto-generate a secure temporary password'}
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
                      <FormItem className="pt-1">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              </section>
            </form>
          </Form>
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="shrink-0 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="dealer-form" disabled={pending} loading={pending}>
            {isEdit ? 'Save Changes' : 'Register Dealer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
