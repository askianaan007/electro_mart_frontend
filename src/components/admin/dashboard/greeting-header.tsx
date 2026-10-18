'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

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
    <PageHeader
      title={`${greeting}, Electro Mart`}
      description="Real-time enterprise metrics, cash flow position, and operational activities."
      actions={
        (currentDateStr || currentTimeStr) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {currentDateStr && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {currentDateStr}
              </span>
            )}
            {currentTimeStr && (
              <span className="hidden items-center gap-1.5 tabular-nums sm:inline-flex">
                <Clock className="size-4" />
                Updated at {currentTimeStr}
              </span>
            )}
          </div>
        )
      }
    />
  );
}
