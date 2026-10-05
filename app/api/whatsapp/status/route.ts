import { NextRequest, NextResponse } from "next/server";
import { callbackUrl, normalizeTwilioStatus, twilioSecret, updateWhatsAppAttempt, validTwilioSignature } from "@/lib/twilio-delivery";
export const runtime="nodejs";
export async function POST(request:NextRequest) {
  const raw=await request.text(); if(raw.length>20000)return new NextResponse(null,{status:413});
  const params=new URLSearchParams(raw),fields:Record<string,string>={};
  for(const [key,value] of params){if(key in fields)return new NextResponse(null,{status:400});fields[key]=value;}
  if(request.nextUrl.searchParams.size!==1)return new NextResponse(null,{status:400});
  const id=request.nextUrl.searchParams.get("attempt")||"";
  if(!/^wha_[a-f0-9-]{36}$/.test(id))return new NextResponse(null,{status:400});
  let url:string;try{url=callbackUrl(id);}catch{return new NextResponse(null,{status:503});}
  if(!validTwilioSignature(url,fields,request.headers.get("x-twilio-signature")||"") || fields.AccountSid!==twilioSecret("TWILIO_ACCOUNT_SID"))return new NextResponse(null,{status:403});
  const state=normalizeTwilioStatus(fields.MessageStatus||fields.SmsStatus||"");
  if(!state||!/^(?:SM|MM)[a-fA-F0-9]{32}$/.test(fields.MessageSid||""))return new NextResponse(null,{status:400});
  try { await updateWhatsAppAttempt(id,fields.MessageSid,state,fields.ErrorCode||null); return new NextResponse(null,{status:204}); }
  catch { return new NextResponse(null,{status:500}); }
}
