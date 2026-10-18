'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex h-9 w-full items-center justify-start gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/70 p-0.5 text-muted-foreground scrollbar-thin sm:w-fit',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs dark:data-[state=active]:bg-secondary [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-4 focus-visible:outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
