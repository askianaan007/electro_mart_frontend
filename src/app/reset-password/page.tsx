'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, KeyRound, Lock } from 'lucide-react';
import { AuthErrorAlert, AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResetPassword } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/api/error';

const schema = z
  .object({
    role: z.enum(['DEALER', 'ADMIN']),
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const resetPassword = useResetPassword();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'ADMIN', token: '', newPassword: '', confirmPassword: '' },
  });

  const role = form.watch('role');

  const onSubmit = form.handleSubmit((values) => {
    setErrorMsg(null);
    resetPassword.mutate(values, {
      onSuccess: () => {
        toast.success('Password reset successfully. You can now log in.');
        router.replace('/login');
      },
      onError: (error) => setErrorMsg(getErrorMessage(error)),
    });
  });

  return (
    <AuthShell
      role={role}
      title="Reset Password"
      description="Paste the token from your email and enter a new password"
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      }
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin Account</SelectItem>
                    <SelectItem value="DEALER">Dealer Account</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reset Token</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <KeyRound className="size-4" />
                    </div>
                    <Input placeholder="Paste token from email" className="h-11 pl-10" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 pl-10"
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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMsg && <AuthErrorAlert message={errorMsg} />}

          <Button type="submit" size="lg" className="h-11 w-full text-[15px] shadow-md shadow-primary/25" loading={resetPassword.isPending}>
            {resetPassword.isPending ? 'Resetting…' : 'Reset Password'}
            {!resetPassword.isPending && <ArrowRight />}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
