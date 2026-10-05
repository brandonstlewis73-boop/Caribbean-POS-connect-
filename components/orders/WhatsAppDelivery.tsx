"use client";
import { userMessage } from "@/lib/user-messages";
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
  if(!payload.data.attempts.length)setError("No automatic message history is available for this order.");
 }catch(e){setError(userMessage(e, "Delivery check failed."));}finally{setBusy(false);}}
 const latestCustomer = attempts.find(a=>a.status.startsWith("customer_"));
 return <section className="min-w-0 rounded-card border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Automatic WhatsApp history</h3><Button type="button" variant="secondary" onClick={()=>void check()} disabled={busy}>{busy?"Checking…":"Check delivery"}</Button></div><p className="mt-2 text-xs text-teal-50/65">Automatic sending uses Twilio and may incur fees. Queued means the message is awaiting delivery. Delivered or read confirms it reached WhatsApp.</p>{error?<p role="alert" className="mt-2 text-sm text-amber-100">{error}</p>:null}{canRetry&&["failed","undelivered"].includes(latestCustomer?.delivery_status||"")?<div className="mt-3"><Button type="button" variant="secondary" disabled={busy} onClick={()=>void check(true)}>Retry paid WhatsApp update</Button><p className="mt-1 text-xs text-teal-50/65">Sends one update to the saved customer number. Contact support if automatic updates keep failing.</p></div>:null}{attempts.map(a=><div key={a.id} className="mt-3 min-w-0 border-t border-white/10 pt-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm capitalize">{a.status.replaceAll("_"," ")}</span><Badge tone={["delivered","read"].includes(a.delivery_status)?"green":["failed","undelivered"].includes(a.delivery_status)?"red":"neutral"}>{a.delivery_status}</Badge></div>{a.error_message?<p className="mt-2 break-words text-sm text-red-100">{userMessage(a.error_message)}</p>:null}</div>)}</section>;
}
