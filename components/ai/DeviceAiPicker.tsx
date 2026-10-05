"use client";
import { useEffect, useState } from "react";
import { readLocalModelChoice, saveLocalModelChoice, type LocalModelChoice } from "@/lib/local-ai-config";
export function DeviceAiPicker({disabled=false}: {disabled?:boolean}) {
  const [choice,setChoice]=useState<LocalModelChoice>("quality");
  useEffect(()=>setChoice(readLocalModelChoice()),[]);
  return <details className="aw-device-ai"><summary>Device AI · {choice==="quality"?"Higher quality":"Lightweight"}</summary>
    <label htmlFor="device-ai-model">Writing preference</label>
    <select id="device-ai-model" value={choice} disabled={disabled} onChange={event=>{const selected=event.target.value as LocalModelChoice;setChoice(selected);saveLocalModelChoice(selected);}}>
      <option value="quality">Better writing · larger download</option><option value="light">Faster writing · smaller download</option>
    </select>
    <p>{choice==="quality"?"About 870 MB download, plus runtime files. Needs more free device memory and can be slower on phones.":"About 300 MB download. Uses less memory but can struggle with complex requests."} Files are cached when browser storage permits.</p>
    <p>iPhone: open directly in Safari on iOS 26 or newer. Close other apps and keep this tab open while generating. Device memory may limit either model. Writing runs on your device without AI usage charges.</p>
  </details>;
}
