import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { PlanGateError, assertFeatureAccess, assertUsageLimit, getBusinessSettings } from "@/lib/data";
import { sendWhatsAppMessage, whatsappConfigStatus } from "@/lib/whatsapp";
import { whatsappTestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const settings = await getBusinessSettings(auth.user.business_id);
  return ok({
    status: whatsappConfigStatus(settings.whatsapp_provider),
    settings: {
      whatsappEnabled: settings.whatsapp_enabled,
      provider: settings.whatsapp_provider || "twilio",
      hasBusinessWhatsAppNumber: Boolean(settings.whatsapp_business_number),
      defaultCountryCode: settings.whatsapp_country_code || "+1868",
      ownerAlertsEnabled: settings.whatsapp_owner_alerts_enabled,
      customerConfirmationsEnabled: settings.whatsapp_customer_confirmations_enabled,
      customerReceiptsEnabled: settings.whatsapp_customer_receipts_enabled,
      driverAssignmentEnabled: settings.whatsapp_driver_assignment_enabled,
      outForDeliveryEnabled: settings.whatsapp_out_for_delivery_enabled
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);

  const parsed = whatsappTestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid WhatsApp test payload", 422, parsed.error.flatten());

  const settings = await getBusinessSettings(auth.user.business_id);
  try {
    await assertFeatureAccess(auth.user.business_id, "whatsappMessaging");
    await assertUsageLimit(auth.user.business_id, "whatsappMessages", 1);
  } catch (error) {
    if (error instanceof PlanGateError) return fail(error.message, error.status, error.details);
    return fail("WhatsApp plan access could not be checked.", 500);
  }
  const to = parsed.data.to || settings.whatsapp_business_number;
  const result = await sendWhatsAppMessage(
    to,
    parsed.data.message || `Test WhatsApp message from ${settings.business_name}.`,
    { defaultCountryCode: settings.whatsapp_country_code, provider: settings.whatsapp_provider }
  );
  return ok({ result, status: whatsappConfigStatus(settings.whatsapp_provider) });
}
