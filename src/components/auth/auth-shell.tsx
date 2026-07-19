import Image from 'next/image';

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
        <Image src="/logo-icon.png" alt="" width={40} height={40} className="size-10 shrink-0" priority />
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
