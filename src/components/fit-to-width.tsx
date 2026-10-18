'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Shows a fixed-width document (an A4 invoice/statement, 210mm wide) scaled
 * down to fit the available width, like a PDF thumbnail, so phones see the
 * whole page instead of a cropped strip. "Zoom" switches to actual size
 * (pan by swiping). Printing is untouched: every scaling style is overridden
 * with print:* !important classes, so the page prints at its real size.
 */
export function FitToWidth({ children, className }: { children: React.ReactNode; className?: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [zoomed, setZoomed] = useState(false);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const available = outer.clientWidth;
      const natural = inner.scrollWidth;
      const next = natural > 0 ? Math.min(1, available / natural) : 1;
      setScale(next);
      setHeight(inner.scrollHeight * next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const fits = scale >= 0.999;
  const applied = zoomed ? 1 : scale;

  return (
    <div className={cn('relative', className)}>
      {!fits && (
        <div className="mb-2 flex items-center justify-between gap-2 print:hidden">
          <p className="text-xs text-muted-foreground">
            {zoomed ? 'Actual size — swipe to move around' : 'Scaled to fit your screen'}
          </p>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setZoomed((z) => !z)}>
            {zoomed ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />}
            {zoomed ? 'Fit to screen' : 'Zoom'}
          </Button>
        </div>
      )}
      <div
        ref={outerRef}
        className={cn(
          'w-full print:h-auto! print:overflow-visible!',
          zoomed ? 'overflow-x-auto scrollbar-thin' : 'overflow-hidden',
        )}
        style={{ height: zoomed ? undefined : height }}
      >
        <div
          ref={innerRef}
          className={cn('w-max origin-top-left print:w-auto! print:transform-none!', fits && 'mx-auto')}
          style={{ transform: applied < 1 ? `scale(${applied})` : undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
