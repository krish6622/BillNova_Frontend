/**
 * Frontend RBAC matrix — mirrors the backend `app/core/permissions.py`.
 *
 * The backend is the real security boundary (every guarded endpoint re-checks the
 * role); this matrix only drives what we *show* and which routes we let the user
 * open, so the UI never dangles controls a cashier can't actually use. Keep the two
 * files in sync.
 *
 * Roles: "OWNER" (Admin / business owner — full access) and "CASHIER" (billing-only).
 */
import type { User } from "@/features/auth/types";

export type Role = User["role"]; // "OWNER" | "CASHIER"

export type Permission =
  | "dashboard:view"
  | "sale:create"
  | "invoice:view"
  | "invoice:reprint"
  | "invoice:void"
  | "invoice:export"
  | "product:view"
  | "product:manage"
  | "purchase:manage"
  | "supplier:manage"
  | "inventory:view"
  | "inventory:adjust"
  | "report:view"
  | "settings:manage"
  | "user:manage"
  | "audit:view";

const CASHIER_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "dashboard:view",
  "sale:create",
  "invoice:view",
  "invoice:reprint",
  "product:view",
]);

const OWNER_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  ...CASHIER_PERMISSIONS,
  "invoice:void",
  "invoice:export",
  "product:manage",
  "purchase:manage",
  "supplier:manage",
  "inventory:view",
  "inventory:adjust",
  "report:view",
  "settings:manage",
  "user:manage",
  "audit:view",
]);

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: OWNER_PERMISSIONS,
  CASHIER: CASHIER_PERMISSIONS,
};

/** True if `role` is granted `permission`. A null/unknown role has no permissions. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** Human label for a role (Owner is presented as "Admin" in the UI). */
export function roleLabel(role: Role | null | undefined): string {
  if (role === "OWNER") return "Admin";
  if (role === "CASHIER") return "Cashier";
  return "—";
}
