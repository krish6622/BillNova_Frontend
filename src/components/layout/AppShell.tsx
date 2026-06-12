import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { UsageBanner } from "@/components/common/UsageBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/pos", label: "Billing POS" },
  { to: "/products", label: "Products" },
  { to: "/purchases", label: "Purchases" },
  { to: "/inventory", label: "Inventory" },
  { to: "/reports", label: "Reports" },
  { to: "/subscription", label: "Subscription" },
  { to: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const tenant = useAuth((s) => s.tenant);
  const logout = useAuth((s) => s.logout);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
        <div className="px-6 py-5">
          <div className="text-xl font-semibold">BillNova</div>
          {tenant && <div className="mt-1 truncate text-xs text-muted-foreground">{tenant.business_name}</div>}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          {user && (
            <div className="mb-2 px-1 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{user.name}</div>
              <div>{user.role}</div>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <UsageBanner />
        {children}
      </main>
    </div>
  );
}
