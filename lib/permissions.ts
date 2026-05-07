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
  dispatcher: [
    "dashboard:read",
    "orders:read",
    "orders:update",
    "customers:read",
    "deliveries:read_assigned",
    "deliveries:manage"
  ],
  driver: ["deliveries:read_assigned", "orders:read"],
  kitchen: ["orders:read", "orders:update", "inventory:read"],
  staff: ["dashboard:read", "orders:read", "customers:read", "inventory:read"]
};

export function hasPermission(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
