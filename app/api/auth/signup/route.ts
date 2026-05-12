import { NextResponse } from "next/server";
import { createSession, sessionCookieOptions } from "@/lib/auth";
import { createBusinessOwnerAccount } from "@/lib/data";
import { businessSignupSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = businessSignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signup data", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await createBusinessOwnerAccount(parsed.data);
    if (!result.user || !result.business) {
      return NextResponse.json({ error: "Business account could not be created." }, { status: 400 });
    }
    const token = await createSession(result.user);
    const response = NextResponse.json(
      {
        data: {
          user: result.user,
          business: result.business,
          storefrontUrl: `/store/${result.business.storefront_slug || result.business.slug}`
        }
      },
      { status: 201 }
    );
    response.cookies.set({ ...sessionCookieOptions(), value: token });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Business account could not be created." },
      { status: 400 }
    );
  }
}
