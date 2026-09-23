import { Link } from "@tanstack/react-router";
import { Flame, Heart, MessageCircle, User } from "lucide-react";
import type { ReactNode } from "react";

const TABS = [
  { to: "/discover", label: "აღმოჩენა", icon: Flame },
  { to: "/likes", label: "მოწონებები", icon: Heart },
  { to: "/matches", label: "ჩატები", icon: MessageCircle },
  { to: "/profile", label: "პროფილი", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-lg">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <tab.icon className="size-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 pb-3 pt-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {action}
    </header>
  );
}
