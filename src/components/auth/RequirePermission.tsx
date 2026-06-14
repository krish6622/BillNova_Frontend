import type { ReactNode } from "react";

import Forbidden from "@/pages/Forbidden";
import { can, type Permission } from "@/lib/rbac";
import { useAuth } from "@/stores/auth";

/**
 * Route-level RBAC guard. Renders `children` only if the signed-in user's role
 * grants `permission`; otherwise shows the 403 page. This blocks manual URL entry
 * (e.g. a cashier typing /settings) — the backend still enforces the same rule on
 * every data call.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const role = useAuth((s) => s.user?.role);
  if (!can(role, permission)) {
    return <Forbidden />;
  }
  return <>{children}</>;
}
