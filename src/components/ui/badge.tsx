import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-4 [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-success/20 bg-success/10 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning',
        info: 'border-info/20 bg-info/10 text-info',
        purple: 'border-purple/20 bg-purple/10 text-purple',
        muted: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
