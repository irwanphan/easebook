import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm font-medium text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
