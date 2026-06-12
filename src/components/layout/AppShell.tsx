import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Truck,
  Zap,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { AmbientBackground } from "@/components/common/AmbientBackground";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UsageBanner } from "@/components/common/UsageBanner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "Billing POS", icon: Zap },
  { to: "/products", label: "Products", icon: Package },
  { to: "/purchases", label: "Purchases", icon: Truck },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/subscription", label: "Subscription", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const tenant = useAuth((s) => s.tenant);
  const logout = useAuth((s) => s.logout);

  return (
    <div className="flex min-h-screen text-foreground">
      <AmbientBackground />

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur-xl dark:bg-white/[0.03] md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-900/40">
            <Receipt className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight">BillNova</div>
            {tenant && <div className="truncate text-xs text-muted-foreground">{tenant.business_name}</div>}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/80 text-white shadow-lg shadow-indigo-900/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-xs font-bold text-white">
                {user.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <UsageBanner />
        {children}
      </main>
    </div>
  );
}
