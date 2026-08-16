'use client';

import { useEffect, useState } from 'react';
import { Activity, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function GreetingHeader() {
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setGreeting(greetingForHour(now.getHours()));
      setCurrentDateStr(
        now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      );
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all duration-300 select-none">
      {/* Background Liquid Glow Orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-gradient-to-br from-purple-600/15 via-indigo-600/10 to-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-52 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-600/10 blur-3xl" />

      {/* Top Specular Shimmer Reflection Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-3xl bg-gradient-to-b from-white/15 via-white/5 to-transparent dark:from-white/10" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side Greeting & Description */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Indicator Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live ERP Dashboard
            </span>

            {/* Date Pill */}
            {currentDateStr && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur-md">
                <Calendar className="size-3.5 text-primary/70" />
                {currentDateStr}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground drop-shadow-xs">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">Electro Mart</span> <span aria-hidden>👋</span>
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Real-time enterprise metrics, cash flow position, and operational activities.
          </p>
        </div>

        {/* Right Side Quick Operational Widget */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/60 px-3.5 py-2 backdrop-blur-md shadow-xs">
            <Activity className="size-4 text-purple-500 animate-pulse" />
            <div className="text-left sm:text-right leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                System Status
              </span>
              <span className="text-xs font-extrabold text-foreground">
                Optimal • 99.9% Uptime
              </span>
            </div>
          </div>
          {currentTimeStr && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Updated at {currentTimeStr}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

