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
  | "support:read"
  | "support:manage"
  | "settings:write"
  | "staff:manage"
  | "audit:read";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
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
    "support:read",
    "support:manage",
    "settings:write",
    "staff:manage",
    "audit:read"
  ],
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
    "support:read",
    "support:manage",
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
    "reports:read",
    "support:read",
    "support:manage"
  ],
  cashier: [
    "dashboard:read",
    "pos:sell",
    "orders:read",
    "customers:read",
    "customers:write",
    "inventory:read",
    "support:read"
  ],
  dispatcher: [
    "dashboard:read",
    "orders:read",
    "orders:update",
    "customers:read",
    "deliveries:read_assigned",
    "deliveries:manage",
    "support:read"
  ],
  driver: ["deliveries:read_assigned", "orders:read", "support:read"],
  kitchen: ["orders:read", "orders:update", "inventory:read", "support:read"],
  staff: ["dashboard:read", "orders:read", "customers:read", "inventory:read", "support:read"]
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
