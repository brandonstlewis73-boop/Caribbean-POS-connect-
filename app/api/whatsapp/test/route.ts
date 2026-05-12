import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getBusinessSettings } from "@/lib/data";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { whatsappTestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const parsed = whatsappTestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid WhatsApp test payload", 422, parsed.error.flatten());

  const settings = await getBusinessSettings(auth.user.business_id);
  const to = parsed.data.to || settings.whatsapp_business_number;
  const result = await sendWhatsAppMessage(
    to,
    parsed.data.message || `Test WhatsApp message from ${settings.business_name}.`,
    { defaultCountryCode: settings.whatsapp_country_code, provider: settings.whatsapp_provider }
  );
  return ok({ result });
}
