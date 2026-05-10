import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/db";
import { createSession, getLoginUserByEmail, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1)
});

const demoUsers = [
  {
    id: "usr_demo_admin",
    name: "Demo Admin",
    email: "admin@demo.com",
    role: "admin" as const,
    phone: "868-443-7582",
    active: true
  },
  {
    id: "usr_setup_admin",
    name: "Asha Maharaj",
    email: "admin@caribbeanpos.test",
    role: "admin" as const,
    phone: "868-555-1001",
    active: true
  }
];

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

    if (isDemoMode) {
      const demoUser = demoUsers.find((user) => user.email === email);
      const isDemoPassword =
        (email === "admin@demo.com" && password === "demo123") ||
        (email === "admin@caribbeanpos.test" && password === "Admin123!");
      if (demoUser && isDemoPassword) {
        return createLoginResponse(demoUser);
      }
      return jsonError("Demo mode is active. Use admin@demo.com / demo123.", 401);
    }

    const row = await getLoginUserByEmail(email);

    if (!row || !(await verifyPassword(password, row.password_hash))) {
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
