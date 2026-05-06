import { redirect } from "next/navigation";
import { getSessionUserFromRequest } from "./auth";
import { hasPermission, type Permission } from "./permissions";
import type { Role } from "./types";

export async function requirePagePermission(permission?: Permission) {
  const user = await getSessionUserFromRequest();
  if (!user) redirect("/login");
  if (permission && !hasPermission(user.role as Role, permission)) {
    redirect(user.role === "driver" ? "/deliveries" : "/");
  }
  return user;
}
