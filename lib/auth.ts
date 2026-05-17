import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { query } from "./db";
import type { Role, User } from "./types";
import { hasPermission, type Permission } from "./permissions";

const COOKIE_NAME = "cpc_session";

type RequireUserResult =
  | { user: User; error: null; status: 200 }
  | { user: undefined; error: string; status: 401 | 403 };

type AuthUserRow = {
  id: string;
  business_id?: string | null;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  active: boolean;
};

type LoginUserRow = AuthUserRow & {
  password_hash: string;
};

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
    businessId: user.business_id,
    name: user.name,
    email: user.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

function isMissingUsersRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return code === "42P01" || message.includes('relation "users" does not exist');
}

export async function getActiveUserById(id: string) {
  try {
    const result = await query<AuthUserRow>(
      "SELECT id, business_id, name, email, role, phone, active FROM users WHERE id = $1 AND active = TRUE",
      [id]
    );
    return result.rows[0] ? { ...result.rows[0], active: Boolean(result.rows[0].active) } : null;
  } catch (error) {
    if (!isMissingUsersRelation(error)) throw error;
    const result = await query<AuthUserRow>(
      "SELECT id, business_id, name, email, role, phone, active FROM staff_users WHERE id = $1 AND active = TRUE",
      [id]
    );
    return result.rows[0] ? { ...result.rows[0], active: Boolean(result.rows[0].active) } : null;
  }
}

export async function getLoginUserByEmail(email: string) {
  try {
    const result = await query<LoginUserRow>(
      "SELECT id, business_id, name, email, password_hash, role, phone, active FROM users WHERE email = $1 AND active = TRUE",
      [email]
    );
    return result.rows[0] ? { ...result.rows[0], active: Boolean(result.rows[0].active) } : null;
  } catch (error) {
    if (!isMissingUsersRelation(error)) throw error;
    const result = await query<LoginUserRow>(
      "SELECT id, business_id, name, email, password_hash, role, phone, active FROM staff_users WHERE email = $1 AND active = TRUE",
      [email]
    );
    return result.rows[0] ? { ...result.rows[0], active: Boolean(result.rows[0].active) } : null;
  }
}

export async function getSessionUserFromRequest(request?: NextRequest): Promise<User | null> {
  const token =
    request?.cookies.get(COOKIE_NAME)?.value || (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secretKey());
    const id = verified.payload.sub;
    if (!id) return null;
    return getActiveUserById(id);
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
