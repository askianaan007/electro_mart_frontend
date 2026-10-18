import { cn } from '@/lib/utils';

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
