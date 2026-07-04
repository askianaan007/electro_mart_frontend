'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
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
      <AuthShell title="Check your email" description="">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="text-sm text-muted-foreground">
            If an account exists, a password reset link has been sent. Use the token from that email on the
            reset password page.
          </p>
          <Button asChild className="mt-2 w-full">
            <Link href="/reset-password">Continue to reset password</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="We'll send a reset token to your registered email"
      footer={
        <Link href="/login" className="hover:text-foreground hover:underline">
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
                <FormLabel>I am a</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DEALER">Dealer</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
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
                <FormLabel>{role === 'ADMIN' ? 'Email' : 'Username'}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={role === 'ADMIN' ? 'admin@electromart.com' : 'your_business_username'}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {role === 'ADMIN' ? 'Your admin login email' : 'The username your admin assigned you'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {errorMsg && <p className="text-sm font-medium text-destructive">{errorMsg}</p>}
          <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
