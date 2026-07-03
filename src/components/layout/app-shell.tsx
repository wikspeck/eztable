import type { ReactNode } from "react";
import { Trophy } from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[20px] bg-slate-950 px-6 py-6 text-white shadow-panel md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Tournament Creator</p>
              <h1 className="mt-1 text-3xl font-bold">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
            </div>
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}
