'use client';

import { useEffect, useState } from 'react';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function GreetingHeader() {
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    // Client-only: server/browser timezones can differ, so the hour is read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {greeting}, Electro Mart <span aria-hidden>👋</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">Here&apos;s what&apos;s happening today.</p>
    </div>
  );
}
