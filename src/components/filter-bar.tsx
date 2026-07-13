export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
