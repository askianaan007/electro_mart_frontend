'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, KeyRound, Lock } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
    defaultValues: { role: 'DEALER', token: '', newPassword: '', confirmPassword: '' },
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
        <Link href="/login" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">
          ← Back to login
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
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Account Type
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-slate-900/80 font-semibold text-xs sm:text-sm text-white backdrop-blur-md focus:ring-blue-600/50">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-white shadow-xl">
                    <SelectItem value="DEALER">Dealer Account</SelectItem>
                    <SelectItem value="ADMIN">Admin Account</SelectItem>
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
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Reset Token
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <KeyRound className="size-4" />
                    </div>
                    <Input
                      placeholder="Paste token from email"
                      className="h-11 rounded-xl border-white/10 bg-slate-900/80 pl-10 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-600/50"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-rose-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 rounded-xl border-white/10 bg-slate-900/80 pl-10 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-600/50"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-rose-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 rounded-xl border-white/10 bg-slate-900/80 pl-10 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-600/50"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs text-rose-400" />
              </FormItem>
            )}
          />

          {errorMsg && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl">{errorMsg}</p>}

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 border border-blue-800/40 text-white font-bold text-base shadow-lg shadow-blue-950/60 transition-all duration-300 hover:shadow-blue-900/80"
            loading={resetPassword.isPending}
          >
            <span>Reset Password</span>
            <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight className="size-4" />
            </span>
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
