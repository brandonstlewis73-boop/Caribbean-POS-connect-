"use client";
import {useEffect,useRef,useState} from "react";
import {Copy,MessageCircle,X} from "lucide-react";
import {freeReceiptMessage,freeWhatsAppLink} from "@/lib/free-whatsapp";
import type {Receipt} from "@/lib/types";
export function FreeReceiptWhatsApp({receipt,phone,currency,onClose}:{receipt:Receipt;phone:string|null|undefined;currency:string;onClose:()=>void}){
 const [text,setText]=useState(()=>freeReceiptMessage(receipt,currency));
 const [feedback,setFeedback]=useState("");
 const panel=useRef<HTMLDivElement>(null);
 const href=freeWhatsAppLink(phone,text);
 useEffect(()=>{panel.current?.scrollIntoView({block:"center",behavior:"smooth"});},[]);
 async function copy(){try{await navigator.clipboard.writeText(text);setFeedback("Copied. Paste into WhatsApp and tap Send.");}catch{setFeedback("Select the receipt text and copy it manually.");}}
 return <div ref={panel} className="mx-4 mt-4 grid min-w-0 gap-3 rounded-card border border-caribbean-line bg-white p-4" aria-label="Free receipt sharing">
  <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Share receipt #{receipt.receipt_number}</h3><button type="button" onClick={onClose} aria-label="Close receipt sharing" className="inline-flex min-h-11 min-w-11 items-center justify-center"><X size={20}/></button></div>
  <p className="text-sm text-slate-600">Review your receipt, open WhatsApp, then tap Send. You can share it again whenever needed.</p>
  <label htmlFor="free-receipt-message" className="text-sm font-semibold">Receipt message</label><textarea id="free-receipt-message" rows={6} value={text} onChange={event=>setText(event.target.value)} className="w-full min-w-0 rounded-card border border-caribbean-line p-3 text-base"/>
  <div className="flex flex-wrap gap-2">{href?<a href={href} style={{backgroundColor:"#087e80",color:"#ffffff"}} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-card bg-caribbean-teal px-4 text-sm font-bold text-white"><MessageCircle size={18}/>Open customer WhatsApp</a>:null}<button type="button" onClick={()=>void copy()} disabled={!text.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-card border border-caribbean-line px-4 text-sm font-bold"><Copy size={18}/>Copy receipt</button></div>
  {!href?<p role="alert" className="text-sm text-red-700">A valid customer number and receipt message are needed to open WhatsApp.</p>:null}
  <p className="text-sm text-slate-600">This shares the receipt as text. To attach a PDF, save it using Print and add it in WhatsApp. Check WhatsApp’s ticks for delivery.</p>
  {feedback?<p role="status" className="text-sm">{feedback}</p>:null}
 </div>;
}
