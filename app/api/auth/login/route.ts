import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode, query } from "@/lib/db";
import { createSession, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const demoUser = {
  id: "usr_demo_admin",
  name: "Demo Admin",
  email: "admin@demo.com",
  role: "admin" as const,
  phone: "868-443-7582",
  active: true
};

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

    if (isDemoMode) {
      if (email === demoUser.email && parsed.data.password === "demo123") {
        return createLoginResponse(demoUser);
      }
      return jsonError("Demo mode is active. Use admin@demo.com / demo123.", 401);
    }

    const result = await query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: "admin" | "manager" | "cashier" | "driver" | "staff";
      phone: string | null;
      active: boolean;
    }>(
      "SELECT id, name, email, password_hash, role, phone, active FROM users WHERE email = $1 AND active = TRUE",
      [email]
    );
    const row = result.rows[0];

    if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
      return jsonError("Invalid email or password", 401);
    }

    return createLoginResponse({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      active: row.active
    });
  } catch (error) {
    console.error("Login failed", error);
    return jsonError("Login failed. Please check the server configuration.", 500);
  }
}
