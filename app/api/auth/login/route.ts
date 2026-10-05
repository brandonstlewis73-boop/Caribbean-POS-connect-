import { enforceRateLimit, limitRequest } from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { z } from "zod";
import { safeDatabaseErrorDetails } from "@/lib/db";
import { createSession, getLoginUserByEmail, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function createLoginResponse(user: User) {
  const token = await createSession(user);
  const response = NextResponse.json({ data: { user } });
  response.cookies.set({ ...sessionCookieOptions(), value: token });
  return response;
}

export async function POST(request: Request) {
  const limited = await limitRequest(request, "login-ip", 30, 900);
  if (limited) return limited;
  try {
    const parsed = loginSchema.safeParse(await readBoundedJson(request));
    if (!parsed.success) {
      return jsonError("Email and password are required", 422, parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const accountLimit = await enforceRateLimit({ scope: "login-account", key: email, limit: 15, windowSeconds: 900 });
    if (accountLimit) return accountLimit;
    const row = await getLoginUserByEmail(email);

    // Perform a bcrypt comparison for unknown accounts as well.
    const valid = await verifyPassword(password, row?.password_hash || "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW");
    if (!row || !row.business_id || !valid) {
      return jsonError("Invalid email or password", 401);
    }

    return createLoginResponse({
      id: row.id,
      business_id: row.business_id || null,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      active: row.active
    });
  } catch (error) {
    const details = safeDatabaseErrorDetails(error);
    console.error("Login failed", details);
    return jsonError("Sign in is temporarily unavailable. Please try again later.", 503);
  }
}
