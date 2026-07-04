import { Zap } from 'lucide-react';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Zap className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold">Electro Mart</p>
          <p className="text-xs text-muted-foreground">ERP &amp; Dealer Portal</p>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>

      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
