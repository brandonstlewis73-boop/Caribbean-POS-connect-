import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address.", details: parsed.error.flatten() }, { status: 422 });
  }

  console.info("Password reset requested", { email: parsed.data.email.toLowerCase() });
  return NextResponse.json({
    data: {
      message:
        "If that account exists, a password reset request has been recorded. Email delivery can be connected later."
    }
  });
}
