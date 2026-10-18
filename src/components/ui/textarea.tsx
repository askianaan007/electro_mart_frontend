import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 dark:bg-muted/40',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
