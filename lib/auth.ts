import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, signSession, verifySessionClaims, sessionSecretKey } from "./session";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { query } from "./db";
import type { Role, User } from "./types";
import { hasPermission, type Permission } from "./permissions";

const COOKIE_NAME = SESSION_COOKIE_NAME;

type RequireUserResult =
  | { user: User; error: null; status: 200 }
  | { user: undefined; error: string; status: 401 | 403 | 503 };

type AuthUserRow = {
  id: string;
  password_hash: string;
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

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: User) {
  const current = await getActiveUserById(user.id);
  if (!current || !current.user.business_id) throw new Error("Active business account required");
  return signSession(user.id, current.authVersion);
}

function isMissingUsersRelation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";
  return code === "42P01" || message.includes('relation "users" does not exist');
}

function sessionIdentity(row: AuthUserRow) {
  const { password_hash, ...user } = row;
  return {
    user: { ...user, active: Boolean(user.active) },
    authVersion: createHmac("sha256", sessionSecretKey()).update(password_hash).digest("hex")
  };
}

export async function getActiveUserById(id: string) {
  try {
    const result = await query<AuthUserRow>(
      "SELECT id, business_id, name, email, password_hash, role, phone, active FROM users WHERE id = $1 AND active = TRUE",
      [id]
    );
    return result.rows[0] ? sessionIdentity(result.rows[0]) : null;
  } catch (error) {
    if (!isMissingUsersRelation(error)) throw error;
    const result = await query<AuthUserRow>(
      "SELECT id, business_id, name, email, password_hash, role, phone, active FROM staff_users WHERE id = $1 AND active = TRUE",
      [id]
    );
    return result.rows[0] ? sessionIdentity(result.rows[0]) : null;
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

  let claims: Awaited<ReturnType<typeof verifySessionClaims>>;
  try {
    claims = await verifySessionClaims(token);
  } catch {
    return null;
  }
  const { id, authVersion } = claims;
  try {
    const current = await getActiveUserById(id);
    if (!current || current.authVersion !== authVersion) return null;
    const user = current.user;
    // Missing business context must never reach unscoped list/query helpers.
    return user?.business_id ? user : null;
  } catch {
    throw new SessionUnavailableError();
  }
}

export class SessionUnavailableError extends Error {
  constructor() {
    super("Your connection is temporarily unavailable. Please try again.");
    this.name = "SessionUnavailableError";
  }
}

export async function requireUser(
  request: NextRequest,
  permission?: Permission
): Promise<RequireUserResult> {
  let user: User | null;
  try {
    user = await getSessionUserFromRequest(request);
  } catch (error) {
    if (error instanceof SessionUnavailableError) return { user: undefined, error: error.message, status: 503 };
    throw error;
  }
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
    sameSite: "lax" as const,
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
