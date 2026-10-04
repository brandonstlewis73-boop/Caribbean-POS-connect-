"use client";
import { useEffect, useState } from "react";
import { readLocalModelChoice, saveLocalModelChoice, type LocalModelChoice } from "@/lib/local-ai-config";
export function DeviceAiPicker({disabled=false}: {disabled?:boolean}) {
  const [choice,setChoice]=useState<LocalModelChoice>("quality");
  useEffect(()=>setChoice(readLocalModelChoice()),[]);
  return <details className="aw-device-ai"><summary>Device AI · {choice==="quality"?"Higher quality":"Lightweight"}</summary>
    <label htmlFor="device-ai-model">Local model</label>
    <select id="device-ai-model" value={choice} disabled={disabled} onChange={event=>{const selected=event.target.value as LocalModelChoice;setChoice(selected);saveLocalModelChoice(selected);}}>
      <option value="quality">Higher quality · Qwen 2.5 1.5B</option><option value="light">Lightweight · Qwen 2.5 0.5B</option>
    </select>
    <p>{choice==="quality"?"About 870 MB download, plus runtime files. Needs roughly 1.6–1.9 GB of free GPU memory. Larger model; slower on phones.":"About 300 MB download. Uses less memory but can struggle with complex requests."} Files are cached when browser storage permits.</p>
    <p>iPhone: open directly in Safari on iOS 26 or newer. Close other apps and keep this tab open while generating. Device memory may limit either model. No paid AI fallback.</p>
  </details>;
}
