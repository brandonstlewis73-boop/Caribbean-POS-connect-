import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createId, query, transaction } from "./db";

export const TWILIO_STATUSES = ["queued", "sending", "sent", "delivered", "read", "failed", "undelivered"] as const;
export type TwilioStatus = typeof TWILIO_STATUSES[number];
export function normalizeTwilioStatus(value: string): TwilioStatus | null {
  if (["accepted", "scheduled"].includes(value)) return "queued";
  return TWILIO_STATUSES.includes(value as TwilioStatus) ? value as TwilioStatus : null;
}
export function deliveryCanAdvance(current: TwilioStatus, next: TwilioStatus) {
  const rank: Record<TwilioStatus,number> = { queued:0, sending:1, sent:2, failed:3, undelivered:3, delivered:4, read:5 };
  return rank[next] >= rank[current];
}
export function twilioDeliveryHelp(code?: string | null) {
  if (code === "63016") return "The WhatsApp 24-hour reply window has expired. Ask the recipient to message your WhatsApp sender again, or use an approved utility template for order updates.";
  if (code === "63015") return "The recipient must join the Twilio WhatsApp sandbox. Sandbox membership expires after three days.";
  if (code === "63007") return "The WhatsApp sender is not approved. Check the configured sender or sandbox number.";
  if (code === "63055") return "A non-marketing message was routed through Marketing Messages Lite. Order updates must use the WhatsApp Cloud API route. Check the sender routing with Twilio.";
  if (code === "20003") return "Twilio authentication failed. Check the Account SID and Auth Token belong to the same account.";
  if (code === "21608") return "The Twilio trial account cannot message this recipient. Verify the recipient or upgrade the Twilio account.";
  return code ? `Twilio delivery failed (code ${code}). See https://www.twilio.com/docs/api/errors/${encodeURIComponent(code)}.` : "Twilio could not deliver the message. Check the recipient and sender in Twilio Messaging Logs.";
}
export function twilioSecret(name: string) { return (process.env[name] || "").trim().replace(/^(['"])(.*)\1$/, "$2").trim(); }
export function callbackUrl(attemptId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) throw new Error("Set NEXT_PUBLIC_APP_URL to enable WhatsApp delivery callbacks.");
  const url = new URL("/api/whatsapp/status", base);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("WhatsApp callbacks require an HTTPS application URL.");
  url.searchParams.set("attempt", attemptId); return url.toString();
}
export function validTwilioSignature(url: string, fields: Record<string,string>, signature: string, token=twilioSecret("TWILIO_AUTH_TOKEN")) {
  if (!token || !signature) return false;
  const source = url + Object.keys(fields).sort().map(key => key + fields[key]).join("");
  const expected = Buffer.from(createHmac("sha1",token).update(source).digest("base64"));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && timingSafeEqual(expected,supplied);
}
export type WhatsAppAttempt = { id:string; business_id:string; order_id:string|null; notification_id:string|null; provider_message_sid:string|null; delivery_status:TwilioStatus; error_code:string|null; error_message:string|null; status:string; created_at:string };
export async function startWhatsAppAttempt(input: {businessId:string; orderId?:string|null; customerId?:string|null; notificationId?:string; to:string; message:string; status?:string}) {
  const dedupe = createHash("sha256").update([input.businessId,input.to,input.orderId||"",input.notificationId||"",input.status||"",input.message].join("|")).digest("hex");
  return transaction(async client => {
    await query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",[dedupe],client);
    const existing = await query<WhatsAppAttempt>("SELECT * FROM whatsapp_message_attempts WHERE business_id=$1 AND dedupe_key=$2 AND created_at > NOW() - INTERVAL '10 minutes' AND delivery_status NOT IN ('failed','undelivered') ORDER BY created_at DESC LIMIT 1",[input.businessId,dedupe],client);
    if (existing.rows[0]) return {attempt:existing.rows[0],duplicate:true};
    const id=createId("wha");
    const result=await query<WhatsAppAttempt>(`INSERT INTO whatsapp_message_attempts (id,business_id,order_id,customer_id,notification_id,destination,status,dedupe_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[id,input.businessId,input.orderId||null,input.customerId||null,input.notificationId||null,input.to,input.status||"message",dedupe],client);
    return {attempt:result.rows[0],duplicate:false};
  });
}
export async function updateWhatsAppAttempt(id:string, sid:string|null, state:TwilioStatus, code:string|null=null) {
  return transaction(async client => {
    const result=await query<WhatsAppAttempt>("SELECT * FROM whatsapp_message_attempts WHERE id=$1 FOR UPDATE",[id],client);
    const attempt=result.rows[0]; if (!attempt) return null;
    if (sid && attempt.provider_message_sid && sid!==attempt.provider_message_sid) throw new Error("Twilio message does not match this attempt.");
    if (!deliveryCanAdvance(attempt.delivery_status,state)) return attempt;
    const error=["failed","undelivered"].includes(state)?twilioDeliveryHelp(code):null;
    const changed=await query<WhatsAppAttempt>("UPDATE whatsapp_message_attempts SET provider_message_sid=COALESCE($2,provider_message_sid),delivery_status=$3,error_code=$4,error_message=$5,updated_at=NOW() WHERE id=$1 RETURNING *",[id,sid,state,code,error],client);
    if (attempt.notification_id) await query("UPDATE customer_notifications SET delivery_status=$2,error_message=$3,sent_at=CASE WHEN $2 IN ('sent','delivered','read') THEN COALESCE(sent_at,NOW()) ELSE sent_at END WHERE id=$1 AND business_id=$4",[attempt.notification_id,state,error,attempt.business_id],client);
    if(attempt.order_id && attempt.status === "customer_receipt" && ["sent","delivered","read"].includes(state))
      await query("UPDATE receipts SET whatsapp_sent_at=COALESCE(whatsapp_sent_at,NOW()),updated_at=NOW() WHERE order_id=$1 AND business_id=$2",[attempt.order_id,attempt.business_id],client);
    return changed.rows[0];
  });
}
export async function getWhatsAppAttempts(businessId:string,orderId:string) {
  return (await query<WhatsAppAttempt>("SELECT id,business_id,order_id,notification_id,provider_message_sid,delivery_status,error_code,error_message,status,created_at FROM whatsapp_message_attempts WHERE business_id=$1 AND order_id=$2 ORDER BY created_at DESC LIMIT 20",[businessId,orderId])).rows;
}
export async function refreshWhatsAppAttempt(attempt:WhatsAppAttempt) {
  if (!attempt.provider_message_sid) return attempt;
  const sid=twilioSecret("TWILIO_ACCOUNT_SID"),token=twilioSecret("TWILIO_AUTH_TOKEN");
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${attempt.provider_message_sid}.json`,{headers:{Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`},cache:"no-store",signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Twilio delivery check failed (HTTP ${response.status}).`);
  const body=await response.json();const state=normalizeTwilioStatus(body.status);
  if(!state || body.sid!==attempt.provider_message_sid)throw new Error("Twilio returned an unexpected message status.");
  return await updateWhatsAppAttempt(attempt.id,body.sid,state,body.error_code?String(body.error_code):null)||attempt;
}
