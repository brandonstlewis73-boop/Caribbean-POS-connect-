import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getOrder } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import { query } from "@/lib/db";
import { limitRequest } from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-security";
import { calculateDeliveryEta } from "@/lib/delivery-eta";
export const runtime = "nodejs";
const schema = z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const auth = await requireUser(request,"deliveries:read_assigned");
  if (!auth.user) return fail(auth.error,auth.status);
  if(auth.user.role!=="driver" && !hasPermission(auth.user.role,"deliveries:manage"))return fail("You do not have permission for this action",403);
  const limited = await limitRequest(request,"delivery-eta",6,60);if(limited)return limited;
  const input = schema.safeParse(await readBoundedJson(request));if(!input.success)return fail("Allow location access to estimate arrival.",422);
  const {id} = await params;
  const order = await getOrder(id,auth.user.business_id);
  if(!order || order.order_type!=="delivery" || (auth.user.role==="driver" && order.assigned_driver_id!==auth.user.id))return fail("Delivery not found",404);
  if(order.status==="cancelled" || !["pending","assigned","out_for_delivery"].includes(order.delivery_status))return fail("Arrival estimates are available for active deliveries.",409);
  try {
    const estimate = await calculateDeliveryEta(order,input.data);
    const result = await query(`UPDATE orders SET estimated_delivery_at=$1::timestamptz, updated_at=NOW()
      WHERE id=$2 AND business_id=$3 AND status!='cancelled'
      AND delivery_status IN ('pending','assigned','out_for_delivery')
      AND ($4::text IS NULL OR assigned_driver_id=$4) RETURNING id`,[estimate.arrival,id,auth.user.business_id,auth.user.role==="driver"?auth.user.id:null]);
    if(!result.rows.length)return fail("This delivery changed. Refresh before estimating arrival.",409);
    return ok({order:await getOrder(id,auth.user.business_id),estimate});
  } catch(error) {
    console.error("Arrival estimate unavailable",error instanceof Error?error.name:"Error");
    return fail("We couldn’t estimate arrival. Check the delivery address or GPS location and try again.",422);
  }
}
