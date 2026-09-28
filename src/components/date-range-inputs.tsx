import { Input } from '@/components/ui/input';

/**
 * "[from] to [to]" date pair for FilterBar. Stays on one line on phones
 * (the two inputs share the width) instead of FilterBar's column layout
 * stacking "to" on its own row.
 */
export function DateRangeInputs({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className="min-w-0 flex-1 px-2 sm:w-auto sm:flex-none sm:px-3"
        aria-label="From date"
      />
      <span className="shrink-0 text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className="min-w-0 flex-1 px-2 sm:w-auto sm:flex-none sm:px-3"
        aria-label="To date"
      />
    </div>
  );
}
