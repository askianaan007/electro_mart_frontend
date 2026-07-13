import { Loader2 } from 'lucide-react';

export function SectionHeader({
  title,
  isFetching,
}: {
  title: string;
  isFetching: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-4 pb-0">
      <h2 className="text-lg font-medium">{title}</h2>
      {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
