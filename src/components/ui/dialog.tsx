'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { X } from 'lucide-react';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
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

function DialogContent({
  className,
  children,
  title,
  mobileFullScreen,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title?: string;
  /** On phones, fill the screen above the keyboard instead of floating in the middle — for forms with typing. */
  mobileFullScreen?: boolean;
}) {
  const viewport = useVisualViewport();
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl scrollbar-thin data-[state=open]:animate-ui-pop-in sm:p-6',
          mobileFullScreen &&
            'max-sm:left-0 max-sm:top-(--vv-top) max-sm:h-(--vv-height) max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:content-start max-sm:overscroll-contain max-sm:rounded-none max-sm:border-0 max-sm:pt-[max(1.25rem,env(safe-area-inset-top))]',
          className,
        )}
        style={
          mobileFullScreen
            ? ({
                '--vv-height': viewport ? `${viewport.height}px` : '100dvh',
                '--vv-top': viewport ? `${viewport.top}px` : '0px',
                ...style,
              } as React.CSSProperties)
            : style
        }
        {...props}
      >
        {!title && (
          <VisuallyHidden asChild>
            <DialogPrimitive.Title>Dialog</DialogPrimitive.Title>
          </VisuallyHidden>
        )}
        {children}
        <DialogPrimitive.Close className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pr-8 text-left', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold tracking-tight', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
