import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { NextRequest } from "next/server";
import { callbackUrl,deliveryCanAdvance,normalizeTwilioStatus,validTwilioSignature,twilioDeliveryHelp,updateWhatsAppAttempt,getWhatsAppAttempts } from "../lib/twilio-delivery";
import { dispatchCustomerStatusNotification,retryCustomerWhatsApp } from "../lib/data";
import { sendWhatsAppMessage } from "../lib/whatsapp-server";
import { customerWhatsAppEnabled } from "../lib/whatsapp-status-policy";
import { POST as callback } from "../app/api/whatsapp/status/route";
import { POST as deliveryCheck } from "../app/api/orders/[id]/whatsapp/route";
import type { Order, Settings } from "../lib/types";
async function main(){
 process.env.CPC_AUTO_MIGRATE="false";process.env.NEXT_PUBLIC_APP_URL="https://app.example";process.env.TWILIO_ACCOUNT_SID="AC"+"a".repeat(32);process.env.TWILIO_AUTH_TOKEN="test-token";process.env.TWILIO_WHATSAPP_FROM="whatsapp:+14155238886";
 const sid="SM"+"b".repeat(32);const attempts:Record<string,any>={};let notificationState="queued",posts=0,dedupeCalls=0;const providerState="queued";let retryEligible=false;let observedForm:URLSearchParams|null=null;
 const originalPool=globalThis.__cpcPool,originalFetch=globalThis.fetch;
 const client={async query(sql:string,params:any[]=[]){
  if(sql.startsWith("UPDATE customer_notifications SET delivery_status='queued'")){assert(sql.includes("business_id=$2"));assert(sql.includes("failed"));assert(sql.includes("FOR UPDATE SKIP LOCKED"));const rows=retryEligible?[{id:"accepted-notification"}]:[];retryEligible=false;return{rows};}
  if(sql.startsWith("SELECT id,message,destination FROM customer_notifications")){assert(sql.includes("business_id=$2"));return{rows:params[2]==="accepted"?[{id:"accepted-notification",message:"Order accepted.",destination:"+12025550123"}]:[]};}
  if(sql.startsWith("SELECT pg_advisory")){dedupeCalls++;return{rows:[]};}
  if(sql.startsWith("SELECT * FROM whatsapp_message_attempts WHERE business_id"))return{rows:Object.values(attempts).filter(a=>a.business_id===params[0]&&a.dedupe_key===params[1]&&!['failed','undelivered'].includes(a.delivery_status)).slice(-1)};
  if(sql.startsWith("INSERT INTO whatsapp_message_attempts")){const a={id:params[0],business_id:params[1],order_id:params[2],notification_id:params[4],dedupe_key:params[7],provider_message_sid:null,delivery_status:"queued",error_code:null,error_message:null,status:params[6],created_at:new Date().toISOString()};attempts[a.id]=a;return{rows:[a]};}
  if(sql.startsWith("SELECT * FROM whatsapp_message_attempts WHERE id"))return{rows:attempts[params[0]]?[{...attempts[params[0]]}]:[]};
  if(sql.startsWith("UPDATE whatsapp_message_attempts")){const a=attempts[params[0]];Object.assign(a,{provider_message_sid:params[1]||a.provider_message_sid,delivery_status:params[2],error_code:params[3],error_message:params[4]});return{rows:[a]};}
  if(sql.startsWith("UPDATE customer_notifications")){assert(sql.includes("business_id=$4"));assert.equal(params[3],"business-one");notificationState=params[1];}
  if(sql.startsWith("SELECT id,business_id,order_id"))return{rows:Object.values(attempts).filter(a=>a.business_id===params[0]&&a.order_id===params[1])};
  return{rows:[]};},release(){}};
 globalThis.__cpcPool={query:client.query.bind(client),connect:async()=>client} as unknown as Pool;
 globalThis.fetch=async(url,init)=>{assert(String(url).startsWith("https://api.twilio.com/2010-04-01/Accounts/AC"));posts++;observedForm=new URLSearchParams(String(init?.body));return new Response(JSON.stringify({sid:posts===1?sid:"SM"+posts.toString(16).padStart(32,"0"),status:providerState}),{status:201});};
 try{
 assert.equal(normalizeTwilioStatus("accepted"),"queued");assert.equal(normalizeTwilioStatus("unknown"),null);assert(!deliveryCanAdvance("delivered","sent"));assert(!deliveryCanAdvance("read","failed"));assert(deliveryCanAdvance("queued","undelivered"));assert.match(twilioDeliveryHelp("63016"),/24-hour/);assert.match(twilioDeliveryHelp("63015"),/join/);assert.match(twilioDeliveryHelp("63055"),/Cloud API/);
 const flags={business_name:"Baker buds",whatsapp_enabled:true,notification_whatsapp_enabled:true,whatsapp_customer_confirmations_enabled:true,whatsapp_customer_receipts_enabled:false,receipt_whatsapp_enabled:false,whatsapp_out_for_delivery_enabled:false} as Settings;
 assert(customerWhatsAppEnabled("accepted",flags));assert(customerWhatsAppEnabled("preparing",flags));assert(customerWhatsAppEnabled("ready",flags));assert(!customerWhatsAppEnabled("completed",flags));assert(!customerWhatsAppEnabled("new",{...flags,whatsapp_enabled:false}));
 const options={businessId:"business-one",orderId:"order-one",notificationId:"notification-one",status:"customer_new"};
 const result=await sendWhatsAppMessage("+12025550123","Order #1061\\nReceived",options);assert(result.ok);assert.equal(result.deliveryStatus,"queued");assert.equal(posts,1);assert.equal(notificationState,"queued");assert.equal(observedForm!.get("Body"),"Order #1061\nReceived");assert.match(observedForm!.get("StatusCallback")!,/https:\/\/app.example\/api\/whatsapp\/status\?attempt=wha_/);
 const id=Object.keys(attempts)[0],url=callbackUrl(id),fields={AccountSid:process.env.TWILIO_ACCOUNT_SID,MessageSid:sid,MessageStatus:"delivered"};
 const sign=(data:Record<string,string>)=>createHmac("sha1","test-token").update(url+Object.keys(data).sort().map(k=>k+data[k]).join("")).digest("base64");
 assert(validTwilioSignature(url,fields,sign(fields)));assert(!validTwilioSignature(url,{...fields,MessageStatus:"failed"},sign(fields)));assert(!validTwilioSignature(url,fields,"invalid"));
 const req=(data:Record<string,string>,signature:string)=>new NextRequest(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","x-twilio-signature":signature},body:new URLSearchParams(data)});
 assert.equal((await callback(req(fields,"invalid"))).status,403);assert.equal(notificationState,"queued");assert.equal((await callback(req(fields,sign(fields)))).status,204);assert.equal(notificationState,"delivered");
 const late={...fields,MessageStatus:"sent"};assert.equal((await callback(req(late,sign(late)))).status,204);assert.equal(notificationState,"delivered");assert.equal((await callback(req(fields,sign(fields)))).status,204);
 await assert.rejects(updateWhatsAppAttempt(id,"SM"+"c".repeat(32),"read"),/does not match/);
 await sendWhatsAppMessage("+12025550123","Order #1061\\nReceived",options);assert.equal(posts,1);assert(dedupeCalls>=2);
 assert.equal((await getWhatsAppAttempts("other-business","order-one")).length,0);
 await dispatchCustomerStatusNotification({id:"order-one",business_id:"business-one",order_number:"1061",customer_snapshot:{name:"Test customer",phone:"+12025550123"},status:"accepted"} as Order, {...flags,whatsapp_country_code:"+1"});
 await assert.rejects(retryCustomerWhatsApp({id:"order-one",business_id:"business-one",order_number:"1061",customer_snapshot:{name:"Test customer",phone:"+12025550123"},status:"accepted"} as Order,flags),/no failed/);
 assert.equal(posts,2);assert.equal(observedForm!.get("Body"),"Order accepted.");
 const templateOptions={...options,notificationId:"template-notification",contentSid:"HX"+"d".repeat(32),contentVariables:{"1":"Customer","2":"Baker buds","3":"1061","4":"Ready","5":"https://app.example/track"}};
 await sendWhatsAppMessage("+12025550123","Template update",templateOptions);assert.equal(posts,3);assert.equal(observedForm!.get("Body"),null);assert.equal(observedForm!.get("ContentSid"),templateOptions.contentSid);assert.equal(JSON.parse(observedForm!.get("ContentVariables")!)["3"],"1061");
 const invalidTemplate=await sendWhatsAppMessage("+12025550123","Invalid template",{...templateOptions,contentSid:"invalid"});assert(!invalidTemplate.ok);assert.equal(posts,3);
 const options2={...options,notificationId:"notification-two",status:"customer_preparing"};await sendWhatsAppMessage("+12025550123","Preparing",options2);assert.equal(posts,4);
 const id2=Object.keys(attempts)[3];await updateWhatsAppAttempt(id2,attempts[id2].provider_message_sid,"undelivered","63016");assert.equal(notificationState,"undelivered");assert.match(attempts[id2].error_message,/24-hour/);
 assert.equal((await deliveryCheck(new NextRequest("https://app.example/api/orders/order-one/whatsapp",{method:"POST",headers:{cookie:"cpc_session=invalid"}}),{params:Promise.resolve({id:"order-one"})})).status,401);
 console.log("PASS: queued vs delivered, signature tampering, account/message ownership checks, callback replay/order, provider SID persistence, database dedupe, customer status flags, delivery error guidance, unauthenticated check, tenant query scope, and escaped newlines. No real Twilio sends.");
 }finally{globalThis.__cpcPool=originalPool;globalThis.fetch=originalFetch;}
}
main().catch(e=>{console.error(e);process.exitCode=1});
