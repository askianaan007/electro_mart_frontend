'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ShoppingCart, Wallet } from 'lucide-react';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Dashboard welcome banner on the brand navy surface, with the two most-used shortcuts. */
export function GreetingHeader() {
  const [greeting, setGreeting] = useState('Good Morning');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setGreeting(greetingForHour(now.getHours()));
      setCurrentDateStr(
        now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      );
      setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-brand-navy px-5 py-6 text-white shadow-lg shadow-brand-navy/20 motion-safe:animate-ui-rise-in sm:px-7 sm:py-7">
      {/* Decorative light + grid */}
      <span aria-hidden className="absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-primary/45 blur-3xl" />
      <span aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-brand-red/15 blur-3xl" />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            {currentDateStr && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                <Calendar className="size-3.5" />
                {currentDateStr}
              </span>
            )}
            {currentTimeStr && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 tabular-nums ring-1 ring-white/10">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-pulse" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                <Clock className="size-3.5" />
                Updated {currentTimeStr}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            {greeting}, Electro <span className="text-brand-red">Mart</span>
          </h1>
          <p className="max-w-xl text-sm text-white/70">
            Real-time enterprise metrics, cash flow position, and operational activities.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Link
            href="/admin/orders/new"
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white px-3 text-sm sm:px-4 font-semibold text-brand-navy shadow-md transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white/90 active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
          >
            <ShoppingCart className="size-4" />
            New Sale
          </Link>
          <Link
            href="/admin/payments"
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-white/10 px-3 text-sm sm:px-4 font-semibold text-white ring-1 ring-white/20 transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
          >
            <Wallet className="size-4" />
            Receive Payment
          </Link>
        </div>
      </div>
    </section>
  );
}
