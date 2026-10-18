'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck, Store, User, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AuthErrorAlert, AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminLogin, useDealerLogin } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/api/error';
import { cn } from '@/lib/utils';
import { setRememberMe, useAuthStore } from '@/stores/auth-store';

const adminSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const dealerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn('h-11 pl-10', className)} {...props} />
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} type={visible ? 'text' : 'password'} className="h-11 pl-10 pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function RememberAndForgot({
  remember,
  onRememberChange,
}: {
  remember: boolean;
  onRememberChange: (v: boolean) => void;
  role: 'ADMIN' | 'DEALER';
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        <span>Remember me</span>
      </label>
      <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
        Forgot password?
      </Link>
    </div>
  );
}

function AdminLoginForm({ remember, onRememberChange }: { remember: boolean; onRememberChange: (v: boolean) => void }) {
  const router = useRouter();
  const login = useAdminLogin();
  const form = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setRememberMe(remember);
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
                <IconInput icon={User} placeholder="admin@electromart.com" autoComplete="username" {...field} />
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
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} role="ADMIN" />
        {login.isError && <AuthErrorAlert message={getErrorMessage(login.error)} />}
        <Button type="submit" size="lg" className="h-11 w-full text-[15px] shadow-md shadow-primary/25" loading={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Log in as Admin'}
          {!login.isPending && <ArrowRight />}
        </Button>
      </form>
    </Form>
  );
}

function DealerLoginForm({
  remember,
  onRememberChange,
}: {
  remember: boolean;
  onRememberChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const login = useDealerLogin();
  const form = useForm<z.infer<typeof dealerSchema>>({
    resolver: zodResolver(dealerSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setRememberMe(remember);
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
                <IconInput icon={Store} placeholder="your_business_username" autoComplete="username" {...field} />
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
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} role="DEALER" />
        {login.isError && <AuthErrorAlert message={getErrorMessage(login.error)} />}
        <Button type="submit" size="lg" className="h-11 w-full text-[15px] shadow-md shadow-primary/25" loading={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Log in as Dealer'}
          {!login.isPending && <ArrowRight />}
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'DEALER'>('ADMIN');
  const [remember, setRemember] = useState(true);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, user, router]);

  return (
    <AuthShell
      role={role}
      title="Log in to your account"
      description="Enter your credentials to continue"
      footer={<span>Need access? Contact your Electro Mart administrator.</span>}
    >
      <Tabs value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'DEALER')}>
        <TabsList className="grid h-11 w-full grid-cols-2 gap-1 p-1 sm:w-full">
          <TabsTrigger
            value="ADMIN"
            className="text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <ShieldCheck />
            Admin
          </TabsTrigger>
          <TabsTrigger
            value="DEALER"
            className="text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Store />
            Dealer
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6">
        {role === 'ADMIN' ? (
          <AdminLoginForm remember={remember} onRememberChange={setRemember} />
        ) : (
          <DealerLoginForm remember={remember} onRememberChange={setRemember} />
        )}
      </div>
    </AuthShell>
  );
}
