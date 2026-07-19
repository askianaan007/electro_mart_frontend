'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Boxes, Eye, EyeOff, Lock, ShieldCheck, TrendingUp, User, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { LoginSplash, SPLASH_HOLD_MS } from '@/components/auth/login-splash';
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

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Boxes, title: 'Smart Inventory', description: 'Real-time stock and product tracking' },
  { icon: TrendingUp, title: 'Business Insights', description: 'Powerful analytics for better decisions' },
  { icon: ShieldCheck, title: 'Secure & Reliable', description: 'Enterprise grade security' },
];

function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input className={cn('pl-10', className)} {...props} />
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} type={visible ? 'text' : 'password'} className="pl-10 pr-10" />
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

function RememberAndForgot({
  remember,
  onRememberChange,
}: {
  remember: boolean;
  onRememberChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <label className="flex cursor-pointer select-none items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        Remember me
      </label>
      <Link href="/forgot-password" className="font-medium text-primary hover:underline">
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
                <IconInput icon={User} placeholder="you@company.com" autoComplete="username" {...field} />
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
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} />
        <Button
          type="submit"
          className="group h-11 w-full bg-gradient-to-r from-primary to-primary/80 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
          loading={login.isPending}
        >
          Log in as Admin
          <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Button>
      </form>
    </Form>
  );
}

function DealerLoginForm({ remember, onRememberChange }: { remember: boolean; onRememberChange: (v: boolean) => void }) {
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
                <IconInput icon={User} placeholder="your_business_username" autoComplete="username" {...field} />
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
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} />
        <Button
          type="submit"
          className="group h-11 w-full bg-gradient-to-r from-primary to-primary/80 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
          loading={login.isPending}
        >
          Log in as Dealer
          <span className="ml-auto flex size-6 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Button>
      </form>
    </Form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'ADMIN' | 'DEALER'>('DEALER');
  const [remember, setRemember] = useState(true);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, user, router]);

  return (
    <div
      className="relative flex min-h-svh w-full overflow-hidden bg-[#050810]"
      style={{ '--login-splash-hold': `${SPLASH_HOLD_MS}ms` } as CSSProperties}
    >
      <LoginSplash />

      {/* One continuous background photo behind the whole screen, on every
          breakpoint — the hero text and the form card both sit on top of
          it rather than the form panel getting a flat, separate backdrop. */}
      <div className="absolute inset-0">
        <Image src="/login-bg.jpg" alt="" fill priority sizes="100vw" className="login-bg-zoom object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
      </div>

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Hero copy + feature strip — desktop/tablet only */}
        <div className="hidden lg:flex lg:h-svh lg:w-[56%] lg:flex-col lg:justify-between lg:p-10 xl:w-[58%] xl:p-16">
          <div />

          <div className="login-rise-in max-w-xl space-y-5" style={{ '--delay': '0.1s' } as CSSProperties}>
            <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Electro <span className="text-red-500">Mart</span>
            </h1>
            <h2 className="text-2xl font-semibold text-white/90 xl:text-3xl">ERP &amp; Dealer Portal</h2>
            <div className="h-1 w-20 rounded-full bg-gradient-to-r from-red-500 to-white/60" />
            <p className="max-w-md text-base text-white/70 xl:text-lg">
              Powering your business with smart ERP solutions and seamless dealer management.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="login-rise-in space-y-2"
                style={{ '--delay': `${0.25 + index * 0.1}s` } as CSSProperties}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-red-400 backdrop-blur-sm">
                  <feature.icon className="size-5" />
                </div>
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="text-xs leading-snug text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form column */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:h-svh lg:overflow-y-auto">
          <div className="login-card-in relative z-10 my-6 w-full max-w-md rounded-2xl border border-white/10 bg-card/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/logo-full.png"
                alt="Electro Mart"
                width={934}
                height={557}
                priority
                className="h-auto w-40 sm:w-48"
              />
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-xl font-semibold">Log in to your account</h2>
              <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
            </div>

            <Tabs value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'DEALER')} className="mt-6">
              <TabsList className="grid h-12 w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="DEALER"
                  className="gap-1.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <User className="size-4" />
                  Dealer
                </TabsTrigger>
                <TabsTrigger
                  value="ADMIN"
                  className="gap-1.5 rounded-lg text-sm font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <ShieldCheck className="size-4" />
                  Admin
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

            <p className="mt-6 text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Electro Mart. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
