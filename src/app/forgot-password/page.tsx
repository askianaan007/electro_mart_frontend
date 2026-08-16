'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, CheckCircle2, KeyRound, Mail, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
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
import { useForgotPassword } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/api/error';

const schema = z.object({
  role: z.enum(['DEALER', 'ADMIN']),
  identifier: z.string().min(1, 'This field is required'),
});

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'DEALER', identifier: '' },
  });

  const role = form.watch('role');

  const onSubmit = form.handleSubmit((values) => {
    setErrorMsg(null);
    forgotPassword.mutate(values, {
      onSuccess: () => setSent(true),
      onError: (error) => setErrorMsg(getErrorMessage(error)),
    });
  });

  if (sent) {
    return (
      <AuthShell title="Check your email" description="A reset link has been dispatched to your registered address">
        <div className="flex flex-col items-center gap-4 text-center py-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-md">
            <CheckCircle2 className="size-8" />
          </div>
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-medium">
            If an account exists for that address, a password reset token has been sent. Copy the token from your inbox to proceed.
          </p>
          <Button
            asChild
            className="mt-3 group h-12 w-full rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white font-bold text-sm shadow-lg shadow-blue-950/60 border border-blue-800/40 transition-all duration-300"
          >
            <Link href="/reset-password">
              <span>Continue to Reset Password</span>
              <ArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      role={role}
      title="Forgot Password?"
      description="Enter your account details to receive a password recovery token"
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
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {role === 'ADMIN' ? 'Admin Email' : 'Dealer Username'}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {role === 'ADMIN' ? <Mail className="size-4" /> : <User className="size-4" />}
                    </div>
                    <Input
                      placeholder={role === 'ADMIN' ? 'admin@electromart.com' : 'your_business_username'}
                      className="h-11 rounded-xl border-white/10 bg-slate-900/80 pl-10 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-600/50"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-[11px] text-slate-400 font-medium">
                  {role === 'ADMIN' ? 'Your admin account login email' : 'The username assigned by your administrator'}
                </FormDescription>
                <FormMessage className="text-xs text-rose-400" />
              </FormItem>
            )}
          />

          {errorMsg && <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl">{errorMsg}</p>}

          <Button
            type="submit"
            className="group h-12 w-full rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 border border-blue-800/40 text-white font-bold text-base shadow-lg shadow-blue-950/60 transition-all duration-300 hover:shadow-blue-900/80"
            loading={forgotPassword.isPending}
          >
            <span>Send Reset Token</span>
            <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
              <KeyRound className="size-4" />
            </span>
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
