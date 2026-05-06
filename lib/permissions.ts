import type { Role } from "./types";

export type Permission =
  | "dashboard:read"
  | "pos:sell"
  | "orders:read"
  | "orders:update"
  | "customers:read"
  | "customers:write"
  | "inventory:read"
  | "inventory:write"
  | "deliveries:read_assigned"
  | "deliveries:manage"
  | "reports:read"
  | "settings:write"
  | "staff:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "dashboard:read",
    "pos:sell",
    "orders:read",
    "orders:update",
    "customers:read",
    "customers:write",
    "inventory:read",
    "inventory:write",
    "deliveries:read_assigned",
    "deliveries:manage",
    "reports:read",
    "settings:write",
    "staff:manage",
    "audit:read"
  ],
  manager: [
    "dashboard:read",
    "pos:sell",
    "orders:read",
    "orders:update",
    "customers:read",
    "customers:write",
    "inventory:read",
    "inventory:write",
    "deliveries:read_assigned",
    "deliveries:manage",
    "reports:read"
  ],
  cashier: [
    "dashboard:read",
    "pos:sell",
    "orders:read",
    "customers:read",
    "customers:write",
    "inventory:read"
  ],
  driver: ["deliveries:read_assigned", "orders:read"],
  staff: ["dashboard:read", "orders:read", "customers:read", "inventory:read"]
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
