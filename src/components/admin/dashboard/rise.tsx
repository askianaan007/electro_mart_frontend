import { cn } from '@/lib/utils';

/**
 * Entrance animation wrapper: fades and lifts its content in, `step` × 55ms
 * after mount, so dashboard sections cascade in. Skipped for users who
 * prefer reduced motion.
 */
export function Rise({
  step = 0,
  className,
  children,
}: {
  step?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('motion-safe:animate-ui-rise-in', className)} style={{ animationDelay: `${step * 55}ms` }}>
      {children}
    </div>
  );
}
