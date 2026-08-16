'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowRight,
  Boxes,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Store,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';
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
  { icon: ShieldCheck, title: 'Secure & Reliable', description: 'Enterprise-grade security' },
];

function IconInput({
  icon: Icon,
  className,
  focusRingClass,
  ...props
}: React.ComponentProps<typeof Input> & { icon: LucideIcon; focusRingClass?: string }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
      <Input
        className={cn(
          'h-11 pl-11 pr-4 bg-slate-900/70 border-slate-700/60 text-white placeholder:text-slate-400/80 rounded-xl transition-all duration-300 backdrop-blur-md',
          focusRingClass || 'focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400',
          className
        )}
        {...props}
      />
    </div>
  );
}

function PasswordInput({
  focusRingClass,
  ...props
}: React.ComponentProps<typeof Input> & { focusRingClass?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(
          'h-11 pl-11 pr-11 bg-slate-900/70 border-slate-700/60 text-white placeholder:text-slate-400/80 rounded-xl transition-all duration-300 backdrop-blur-md',
          focusRingClass || 'focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400'
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
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
  role,
}: {
  remember: boolean;
  onRememberChange: (v: boolean) => void;
  role: 'ADMIN' | 'DEALER';
}) {
  const isAdmin = role === 'ADMIN';
  return (
    <div className="flex items-center justify-between text-xs sm:text-sm">
      <label className="flex cursor-pointer select-none items-center gap-2 text-slate-300 hover:text-white transition-colors">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className={cn(
            'size-4 rounded border-slate-700 bg-slate-900 transition-colors',
            isAdmin ? 'accent-purple-500' : 'accent-cyan-500'
          )}
        />
        <span>Remember me</span>
      </label>
      <Link
        href="/forgot-password"
        className={cn(
          'font-medium transition-colors hover:underline',
          isAdmin ? 'text-purple-400 hover:text-purple-300' : 'text-cyan-400 hover:text-cyan-300'
        )}
      >
        Forgot password?
      </Link>
    </div>
  );
}

function AdminLoginForm({
  remember,
  onRememberChange,
}: {
  remember: boolean;
  onRememberChange: (v: boolean) => void;
}) {
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
              <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Admin Email
              </FormLabel>
              <FormControl>
                <IconInput
                  icon={User}
                  placeholder="admin@electromart.com"
                  autoComplete="username"
                  focusRingClass="focus-visible:ring-purple-500/50 focus-visible:border-purple-400"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-rose-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  focusRingClass="focus-visible:ring-purple-500/50 focus-visible:border-purple-400"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-rose-400" />
            </FormItem>
          )}
        />
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} role="ADMIN" />
        <Button
          type="submit"
          className="group h-12 w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-base shadow-lg shadow-purple-600/30 transition-all duration-300 hover:shadow-purple-600/50"
          loading={login.isPending}
        >
          <span>Log in as Admin</span>
          <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="size-4" />
          </span>
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
              <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Dealer Username
              </FormLabel>
              <FormControl>
                <IconInput
                  icon={Store}
                  placeholder="your_business_username"
                  autoComplete="username"
                  focusRingClass="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-rose-400" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  focusRingClass="focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs text-rose-400" />
            </FormItem>
          )}
        />
        <RememberAndForgot remember={remember} onRememberChange={onRememberChange} role="DEALER" />
        <Button
          type="submit"
          className="group h-12 w-full rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-base shadow-lg shadow-cyan-600/30 transition-all duration-300 hover:shadow-cyan-600/50"
          loading={login.isPending}
        >
          <span>Log in as Dealer</span>
          <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="size-4" />
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

  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dealer/dashboard');
    }
  }, [hasHydrated, user, router]);

  return (
    <div
      className="relative flex min-h-svh w-full overflow-hidden bg-[#030712] select-none"
      style={{ '--login-splash-hold': `${SPLASH_HOLD_MS}ms` } as CSSProperties}
    >
      <LoginSplash />

      {/* Dynamic Role-Based Liquid Glow Background Orbs */}
      <div
        className={cn(
          'absolute -top-32 -left-32 size-[450px] sm:size-[600px] blur-[120px] sm:blur-[150px] opacity-75 pointer-events-none transition-all duration-1000 ease-in-out',
          isAdmin
            ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-900'
            : 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-800'
        )}
        style={{ animation: 'liquid-float-1 15s infinite ease-in-out' }}
      />
      <div
        className={cn(
          'absolute -bottom-32 -right-32 size-[400px] sm:size-[550px] blur-[110px] sm:blur-[140px] opacity-70 pointer-events-none transition-all duration-1000 ease-in-out',
          isAdmin
            ? 'bg-gradient-to-tl from-fuchsia-600 via-violet-700 to-purple-900'
            : 'bg-gradient-to-tl from-cyan-400 via-blue-600 to-indigo-900'
        )}
        style={{ animation: 'liquid-float-2 18s infinite ease-in-out' }}
      />

      {/* Atmospheric Background Photo with Dynamic Mask */}
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <Image src="/login-bg.jpg" alt="" fill priority sizes="100vw" className="login-bg-zoom object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-[#030712]" />
      </div>

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        {/* Left Hero Column — Desktop & Tablet Showcase */}
        <div className="hidden lg:flex lg:h-svh lg:w-[54%] lg:flex-col lg:justify-between lg:p-10 xl:w-[56%] xl:p-16">
          {/* Top Branding Pill */}
          <div className="login-rise-in flex items-center gap-3">
            <div className="flex items-center justify-center p-2.5 rounded-xl border border-white/20 bg-slate-900/60 backdrop-blur-xl shadow-lg">
              <Image
                src="/logo-icon.png"
                alt="ElectroMart"
                width={36}
                height={36}
                className="size-8 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]"
              />
            </div>
            <div>
              <p className="text-base font-extrabold text-white tracking-wide">
                Electro <span className={isAdmin ? 'text-purple-400' : 'text-cyan-400'}>Mart</span>
              </p>
              <p className="text-xs text-slate-400 font-medium">Enterprise Management System</p>
            </div>
          </div>

          {/* Hero Copy */}
          <div className="login-rise-in max-w-xl space-y-5" style={{ '--delay': '0.1s' } as CSSProperties}>
            <div
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-500 shadow-md',
                isAdmin
                  ? 'border-purple-500/40 bg-purple-950/50 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              )}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="size-4 text-purple-400" />
                  <span>Admin Command Portal</span>
                </>
              ) : (
                <>
                  <Store className="size-4 text-cyan-400" />
                  <span>Dealer Commerce Hub</span>
                </>
              )}
            </div>

            <h1 className="text-4xl font-black tracking-tight text-white xl:text-5xl leading-tight">
              Powering Smart <br />
              <span
                className={cn(
                  'text-transparent bg-clip-text',
                  isAdmin
                    ? 'bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-300'
                    : 'bg-gradient-to-r from-cyan-400 via-blue-300 to-teal-300'
                )}
              >
                Electronics Commerce
              </span>
            </h1>

            <p className="max-w-md text-base text-slate-300/90 leading-relaxed font-normal">
              Unified B2B enterprise platform for real-time inventory management, automated billing, and dealer network analytics.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-3 gap-5">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="login-rise-in group space-y-2.5 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20 hover:bg-slate-900/60 shadow-lg"
                style={{ '--delay': `${0.25 + index * 0.1}s` } as CSSProperties}
              >
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl transition-all duration-300',
                    isAdmin
                      ? 'bg-purple-500/20 text-purple-300 group-hover:bg-purple-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500/30'
                  )}
                >
                  <feature.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{feature.title}</p>
                  <p className="mt-1 text-xs text-slate-400 leading-snug">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Column — Liquid Glassy Card */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10 lg:h-svh lg:overflow-y-auto">
          <div className="w-full max-w-md">
            <div
              className={cn(
                'login-card-in relative my-6 w-full rounded-3xl border p-6 sm:p-8 backdrop-blur-3xl shadow-2xl transition-all duration-700 ease-out',
                isAdmin
                  ? 'border-purple-400/40 bg-slate-950/45 shadow-[0_30px_70px_rgba(124,58,237,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]'
                  : 'border-cyan-400/40 bg-slate-950/45 shadow-[0_30px_70px_rgba(6,182,212,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)]'
              )}
            >
              {/* iOS Liquid Glass Top Specular Highlight Overlay */}
              <div className="absolute inset-x-0 top-0 h-32 rounded-t-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none" />

              {/* Logo Header */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <Image
                  src="/logo-full.png"
                  alt="Electro Mart"
                  width={934}
                  height={557}
                  priority
                  className="h-auto w-36 sm:w-44 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                />
              </div>

              <div className="relative z-10 mt-4 text-center">
                <h2
                  className={cn(
                    'text-xl sm:text-2xl font-bold tracking-tight text-transparent bg-clip-text',
                    isAdmin
                      ? 'bg-gradient-to-r from-purple-300 via-violet-200 to-indigo-300'
                      : 'bg-gradient-to-r from-cyan-300 via-blue-200 to-teal-300'
                  )}
                >
                  Log in to your account
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
                  Enter your credentials to continue
                </p>
              </div>

              {/* Segmented iOS Tabs */}
              <Tabs
                value={role}
                onValueChange={(v) => setRole(v as 'ADMIN' | 'DEALER')}
                className="relative z-10 mt-6"
              >
                <TabsList className="grid h-12 w-full grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 p-1 backdrop-blur-md shadow-inner">
                  <TabsTrigger
                    value="DEALER"
                    className="gap-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-600/30 text-slate-400 hover:text-white"
                  >
                    <Store className="size-4" />
                    Dealer
                  </TabsTrigger>
                  <TabsTrigger
                    value="ADMIN"
                    className="gap-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-600/30 text-slate-400 hover:text-white"
                  >
                    <ShieldCheck className="size-4" />
                    Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative z-10 mt-6">
                {role === 'ADMIN' ? (
                  <AdminLoginForm remember={remember} onRememberChange={setRemember} />
                ) : (
                  <DealerLoginForm remember={remember} onRememberChange={setRemember} />
                )}
              </div>

              <p className="relative z-10 mt-6 text-center text-xs text-slate-400">
                &copy; {new Date().getFullYear()} Electro Mart. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


