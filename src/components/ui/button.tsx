import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 active:translate-y-px",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/30',
        outline:
          'border border-input bg-card text-foreground shadow-xs hover:bg-muted hover:text-foreground dark:bg-transparent dark:hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'text-foreground/80 hover:bg-muted hover:text-foreground',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground shadow-xs hover:bg-success/90 focus-visible:ring-success/30',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 gap-1.5 rounded-md px-3 text-[13px]',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
