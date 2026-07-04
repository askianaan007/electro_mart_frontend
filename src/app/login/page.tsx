'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminLogin, useDealerLogin } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/api/error';
import { useAuthStore } from '@/stores/auth-store';

const adminSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const dealerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const login = useAdminLogin();
  const form = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Welcome back');
        router.replace('/admin/dashboard');
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="admin@electromart.com" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" loading={login.isPending}>
          Log in as Admin
        </Button>
      </form>
    </Form>
  );
}

function DealerLoginForm() {
  const router = useRouter();
  const login = useDealerLogin();
  const form = useForm<z.infer<typeof dealerSchema>>({
    resolver: zodResolver(dealerSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        toast.success('Welcome back');
        router.replace('/dealer/dashboard');
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="your_business_username" autoComplete="username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" loading={login.isPending}>
          Log in as Dealer
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'DEALER'>('DEALER');
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, user, router]);

  return (
    <AuthShell
      title="Log in to your account"
      description="Enter your credentials to continue"
      footer={
        <Link href="/forgot-password" className="hover:text-foreground hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <Tabs value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'DEALER')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="DEALER">Dealer</TabsTrigger>
          <TabsTrigger value="ADMIN">Admin</TabsTrigger>
        </TabsList>
      </Tabs>
      {role === 'ADMIN' ? <AdminLoginForm /> : <DealerLoginForm />}
    </AuthShell>
  );
}
