'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, User } from 'lucide-react';
import { AuthErrorAlert, AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
    defaultValues: { role: 'ADMIN', identifier: '' },
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
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-success" />
            <p className="text-sm leading-relaxed text-foreground">
              If an account exists for that address, a password reset token has been sent. Copy the token from your
              inbox to proceed.
            </p>
          </div>
          <Button asChild size="lg" className="mt-2 h-11 w-full">
            <Link href="/reset-password">
              Continue to Reset Password
              <ArrowRight />
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
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{role === 'ADMIN' ? 'Admin Email' : 'Dealer Username'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {role === 'ADMIN' ? <Mail className="size-4" /> : <User className="size-4" />}
                    </div>
                    <Input
                      placeholder={role === 'ADMIN' ? 'admin@electromart.com' : 'your_business_username'}
                      className="h-11 pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  {role === 'ADMIN' ? 'Your admin account login email' : 'The username assigned by your administrator'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMsg && <AuthErrorAlert message={errorMsg} />}

          <Button type="submit" size="lg" className="h-11 w-full text-[15px] shadow-md shadow-primary/25" loading={forgotPassword.isPending}>
            {!forgotPassword.isPending && <KeyRound />}
            {forgotPassword.isPending ? 'Sending…' : 'Send Reset Token'}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
