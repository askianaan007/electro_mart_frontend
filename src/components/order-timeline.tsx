import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/api/types';

const STEPS = ['PENDING_APPROVAL', 'APPROVED', 'PACKED', 'DELIVERED', 'COMPLETED'] as const;
const STEP_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Submitted',
  APPROVED: 'Approved',
  PACKED: 'Packed',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <X className="size-4 shrink-0" />
        <div>
          <p className="font-medium">Order rejected</p>
          {order.rejectReason && <p className="text-destructive/80">{order.rejectReason}</p>}
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="flex items-start justify-between">
      {STEPS.map((step, index) => {
        const done = index <= currentIndex;
        const isLast = index === STEPS.length - 1;
        return (
          <div key={step} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1 sm:gap-1.5">
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-medium sm:size-7 sm:text-xs',
                  done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3 sm:size-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] sm:text-xs',
                  done ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABEL[step]}
              </span>
            </div>
            {!isLast && (
              <div className={cn('mx-1 h-0.5 flex-1 sm:mx-2', index < currentIndex ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
