import { NextResponse } from "next/server";
import { z } from "zod";
import { safeDatabaseErrorDetails } from "@/lib/db";
import { createSession, getLoginUserByEmail, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1)
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
  try {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("Email and password are required", 422, parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const row = await getLoginUserByEmail(email);

    if (!row || !(await verifyPassword(password, row.password_hash))) {
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
    return jsonError(details.message, 500, {
      code: details.code,
      database: details.database
    });
  }
}
