"use client";

import { useId, useState } from "react";
import { MessageCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { freeOrderUpdate, freeWhatsAppLink } from "@/lib/free-whatsapp";
import type { Order } from "@/lib/types";

export function FreeWhatsApp({ order, currency }: { order: Order; currency: string }) {
  const messageId = useId();
  const original = freeOrderUpdate(order, currency);
  const [edited, setEdited] = useState<{ original: string; message: string } | null>(null);
  const [feedback, setFeedback] = useState("");
  const message = edited?.original === original ? edited.message : original;
  const optedOut = order.customer_snapshot.notification_whatsapp === false;
  const href = optedOut ? null : freeWhatsAppLink(order.customer_snapshot.phone, message);
  async function copy() {
    try { await navigator.clipboard.writeText(message); setFeedback("Message copied. Paste it into WhatsApp and tap Send."); }
    catch { setFeedback("Select the message above and copy it manually."); }
  }
  return <section className="grid min-w-0 gap-3 rounded-card border border-caribbean-line bg-white p-4">
    <div className="flex items-center gap-2"><MessageCircle size={20} /><h3 className="font-bold">Free WhatsApp message</h3></div>
    <p className="text-sm text-slate-300">Review the update, open WhatsApp or WhatsApp Business, then tap Send. No Twilio or messaging API is used by this button.</p>
    <div className="grid gap-2"><label htmlFor={messageId} className="text-sm font-semibold">Customer message</label><textarea id={messageId} className="min-h-40 w-full p-3" value={message} onChange={event => { setEdited({ original, message: event.target.value }); setFeedback(""); }} /></div>
    <div className="flex flex-wrap gap-2">
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-card bg-caribbean-teal px-4 text-sm font-bold text-white"><MessageCircle size={18} />Open customer WhatsApp</a> : null}
      {!optedOut ? <Button variant="secondary" onClick={() => void copy()} disabled={!message.trim()}><Copy size={18} />Copy message</Button> : null}
    </div>
    {optedOut ? <p className="text-sm text-red-100">This customer has opted out of WhatsApp notifications.</p> : !href ? <p className="text-sm text-red-100">Add a valid customer phone number with country code, and enter a message.</p> : null}
    <p className="text-xs text-slate-300">Opening WhatsApp does not confirm that a message was sent or delivered. Check the ticks in WhatsApp.</p>
    {feedback ? <p role="status" className="text-sm">{feedback}</p> : null}
  </section>;
}
