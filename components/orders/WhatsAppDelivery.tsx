"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { readApiPayload } from "@/lib/client-response";
import type { Order } from "@/lib/types";
type Attempt={id:string;status:string;delivery_status:string;error_code:string|null;error_message:string|null;provider_message_sid:string|null};
export function WhatsAppDelivery({orderId,onRefresh,canRetry=false}:{orderId:string;canRetry?:boolean;onRefresh:(order:Order)=>void}) {
 const [attempts,setAttempts]=useState<Attempt[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{setAttempts([]);setError("");},[orderId]);
 async function check(retry=false){if(busy)return;setBusy(true);setError("");try{
  const response=await fetch(`/api/orders/${encodeURIComponent(orderId)}/whatsapp`,{method:retry?"PATCH":"POST"});
  const payload=await readApiPayload<{attempts:Attempt[];order:Order}>(response);
  if(!response.ok||!payload.data)throw Error(payload.error||"Delivery check failed.");
  setAttempts(payload.data.attempts);if(payload.data.order)onRefresh(payload.data.order);
  if(!payload.data.attempts.length)setError("No tracked Twilio attempts yet. Older messages may need checking in Twilio Messaging Logs.");
 }catch(e){setError(e instanceof Error?e.message:"Delivery check failed.");}finally{setBusy(false);}}
 const latestCustomer = attempts.find(a=>a.status.startsWith("customer_"));
 const needsSandbox = latestCustomer?.error_code === "63015";
 return <section className="min-w-0 rounded-card border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Automatic WhatsApp history</h3><Button type="button" variant="secondary" onClick={()=>void check()} disabled={busy}>{busy?"Checking…":"Check delivery"}</Button></div><p className="mt-2 text-xs text-teal-50/65">Automatic sending uses Twilio and may incur fees. Queued means Twilio accepted the message. Delivered or read confirms it reached WhatsApp.</p>{error?<p role="alert" className="mt-2 text-sm text-amber-100">{error}</p>:null}{needsSandbox?<div className="mt-3 rounded-card border border-amber-200/20 bg-amber-300/10 p-3"><p className="text-sm font-bold">Recipient setup required</p><p className="mt-1 text-xs leading-5">On the customer’s WhatsApp, send the current join code from your Twilio Sandbox page to your sandbox sender. Membership expires after three days. Then send a message to open the 24-hour reply window and retry the update.</p><a className="mt-2 inline-flex min-h-11 items-center text-sm font-bold underline" href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn" target="_blank" rel="noreferrer">Open Twilio Sandbox setup</a></div>:null}{canRetry&&["failed","undelivered"].includes(latestCustomer?.delivery_status||"")?<div className="mt-3"><Button type="button" variant="secondary" disabled={busy} onClick={()=>void check(true)}>Retry paid WhatsApp update</Button><p className="mt-1 text-xs text-teal-50/65">Sends one update to the saved customer number. Reopen the 24-hour window or configure an approved template first.</p></div>:null}{attempts.map(a=><div key={a.id} className="mt-3 min-w-0 border-t border-white/10 pt-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm capitalize">{a.status.replaceAll("_"," ")}</span><Badge tone={["delivered","read"].includes(a.delivery_status)?"green":["failed","undelivered"].includes(a.delivery_status)?"red":"neutral"}>{a.delivery_status}</Badge></div>{a.error_message?<p className="mt-2 break-words text-sm text-red-100">{a.error_code?`Error ${a.error_code}: `:""}{a.error_message}</p>:null}{a.provider_message_sid?<p className="mt-1 break-all text-xs text-teal-50/55">Message SID: {a.provider_message_sid}</p>:null}</div>)}</section>;
}
