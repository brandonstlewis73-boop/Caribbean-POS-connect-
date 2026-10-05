import { NextRequest } from "next/server";
import { fail,ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { assertFeatureAccess,assertUsageLimit,getBusinessSettings,getOrder,retryCustomerWhatsApp } from "@/lib/data";
import { getWhatsAppAttempts,refreshWhatsAppAttempt } from "@/lib/twilio-delivery";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireUser(request,"orders:read");if(!auth.user)return fail(auth.error,auth.status);
  if(!auth.user.business_id)return fail("Business account is required",403);
  const {id}=await params;const order=await getOrder(id,auth.user.business_id);
  if(!order||(auth.user.role==="driver"&&order.assigned_driver_id!==auth.user.id))return fail("Order not found",404);
  try {
    const attempts=await getWhatsAppAttempts(auth.user.business_id,id);
    const refreshed=await Promise.all(attempts.slice(0,5).map(attempt=>refreshWhatsAppAttempt(attempt)));
    return ok({attempts:refreshed.map(a=>({id:a.id,status:a.status,delivery_status:a.delivery_status,error_code:a.error_code,error_message:a.error_message,provider_message_sid:a.provider_message_sid})),order:await getOrder(id,auth.user.business_id)});
  }catch{return fail("Twilio delivery status could not be checked. Try again or check Twilio Messaging Logs.",502);}
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireUser(request,"orders:update");if(!auth.user)return fail(auth.error,auth.status);
 if(!auth.user.business_id)return fail("Business account is required",403);
 const {id}=await params;const order=await getOrder(id,auth.user.business_id);
 if(!order||(auth.user.role==="driver"&&order.assigned_driver_id!==auth.user.id))return fail("Order not found",404);
 try {
  await assertFeatureAccess(auth.user.business_id,"whatsappMessaging");await assertUsageLimit(auth.user.business_id,"whatsappMessages",1);
  await retryCustomerWhatsApp(order,await getBusinessSettings(auth.user.business_id));
  const attempts=await getWhatsAppAttempts(auth.user.business_id,id);
  return ok({attempts:attempts.map(a=>({id:a.id,status:a.status,delivery_status:a.delivery_status,error_code:a.error_code,error_message:a.error_message,provider_message_sid:a.provider_message_sid})),order:await getOrder(id,auth.user.business_id)});
 }catch(error){return fail(error instanceof Error?error.message:"Customer update could not be retried.",409);}
}
