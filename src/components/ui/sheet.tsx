'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] dark:bg-black/60 data-[state=open]:animate-ui-fade-in',
        className,
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 overflow-hidden bg-card p-5 shadow-xl',
  {
    variants: {
      side: {
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-xs border-r border-border data-[state=open]:animate-ui-slide-in-left',
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-xs border-l border-border data-[state=open]:animate-ui-slide-in-right',
        bottom:
          'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t border-border data-[state=open]:animate-ui-slide-in-bottom',
      },
    },
    defaultVariants: { side: 'left' },
  },
);

function SheetContent({
  className,
  children,
  side = 'left',
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { title?: string }) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {!title && (
          <VisuallyHidden asChild>
            <DialogPrimitive.Title>Menu</DialogPrimitive.Title>
          </VisuallyHidden>
        )}
        {children}
        <DialogPrimitive.Close className="absolute right-3.5 top-3.5 z-50 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
