import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { createOrder, getBusinessBySlug } from "@/lib/data";
import { checkoutSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return fail("Storefront not found", 404);

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid order data", 422, parsed.error.flatten());

  if (!parsed.data.customer?.name?.trim()) return fail("Customer name is required.", 422);
  if (!parsed.data.customer?.phone?.trim()) return fail("Customer WhatsApp/phone is required.", 422);
  if (parsed.data.order_type === "delivery" && !parsed.data.delivery?.street_address?.trim()) {
    return fail("Delivery address is required.", 422);
  }

  try {
    const order = await createOrder(
      {
        ...parsed.data,
        business_id: business.id,
        storefront_slug: slug,
        status: "new",
        // Public checkout cannot establish that payment has been collected.
        payment_status: "unpaid",
        created_by: undefined
      },
      undefined
    );
    return ok({ order }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order could not be submitted.", 400);
  }
}
