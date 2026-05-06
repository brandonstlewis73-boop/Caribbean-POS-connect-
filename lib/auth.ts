import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { isDemoMode, query } from "./db";
import type { Role, User } from "./types";
import { hasPermission, type Permission } from "./permissions";

const COOKIE_NAME = "cpc_session";
const demoUser: User = {
  id: "usr_demo_admin",
  name: "Demo Admin",
  email: "admin@demo.com",
  role: "admin",
  phone: "868-443-7582",
  active: true
};

type RequireUserResult =
  | { user: User; error: null; status: 200 }
  | { user: undefined; error: string; status: 401 | 403 };

function secretKey() {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET || "dev-secret-change-me-caribbean-pos-connect"
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: User) {
  return new SignJWT({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function getSessionUserFromRequest(request?: NextRequest): Promise<User | null> {
  const token =
    request?.cookies.get(COOKIE_NAME)?.value || (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secretKey());
    const id = verified.payload.sub;
    if (!id) return null;
    if (isDemoMode && id === demoUser.id) {
      return demoUser;
    }
    const row = await query<User>(
      "SELECT id, name, email, role, phone, active FROM users WHERE id = $1 AND active = TRUE",
      [id]
    );
    return row.rows[0] ? { ...row.rows[0], active: Boolean(row.rows[0].active) } : null;
  } catch {
    return null;
  }
}

export async function requireUser(
  request: NextRequest,
  permission?: Permission
): Promise<RequireUserResult> {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return { user: undefined, error: "Authentication required", status: 401 as const };
  }

  if (permission && !hasPermission(user.role as Role, permission)) {
    return { user: undefined, error: "You do not have permission for this action", status: 403 as const };
  }

  return { user, error: null, status: 200 as const };
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  };
}

export function expiredSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    value: "",
    maxAge: 0
  };
}
