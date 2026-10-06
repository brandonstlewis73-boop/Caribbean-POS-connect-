import { limitRequest } from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-security";
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await limitRequest(request, "password-reset", 5, 900);
  if (limited) return limited;
  const parsed = forgotPasswordSchema.safeParse(await readBoundedJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address.", details: parsed.error.flatten() }, { status: 422 });
  }

  console.info("Password reset requested");
  return NextResponse.json({
    data: {
      message:
        "If that account exists, a password reset request has been recorded. Email delivery can be connected later."
    }
  });
}
