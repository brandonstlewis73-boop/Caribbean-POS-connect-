"use client";
import { useEffect, useRef, useState } from "react";
import { generateLocalDraft } from "@/lib/local-ai";
import { DeviceAiPicker } from "./DeviceAiPicker";
import "./workspace/ai-workspace.css";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
export function LocalAiTestClient() {
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const [prompt, setPrompt] = useState("Write a short WhatsApp promotion for a Caribbean bakery's lunch special. Use placeholders for prices.");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [output, setOutput] = useState("");
  async function generate() {
    if (busy || !prompt.trim()) return;
    request.current = new AbortController();
    setBusy(true); setOutput(""); setStatus("Starting local AI…");
    try {
      const draft = await generateLocalDraft({ instructions: "You are a helpful Caribbean POS Connect test assistant. Write concise drafts. Do not invent business records or claim to perform actions. Use [PRICE], [BUSINESS NAME], and other bracketed placeholders for missing details in drafts. Do not ask questions when the request asks for placeholders. All outputs need human review.", input: prompt }, setStatus, request.current.signal, setOutput);
      setOutput(draft); setStatus("Local draft ready. Review before using.");
    } catch (error) { setOutput(""); setStatus(error instanceof Error ? error.message : "Local generation failed."); }
    finally { request.current = null; setBusy(false); }
  }
  return <Panel className="w-full max-w-full"><div className="min-w-0 max-w-full space-y-4 p-4 [overflow-wrap:anywhere] sm:p-5">
    <h2 className="text-xl font-bold">Test local AI</h2>
    <p className="text-sm">Generation runs in this browser without API charges. This test uses only the text you enter; it does not load business records or change your subscription.</p>
    <p className="text-sm">Choose a model below. Use a compatible WebGPU browser with enough free device memory. Clicking Download &amp; generate starts the download. No paid fallback is enabled.</p>
    <DeviceAiPicker disabled={busy}/>
    <TextAreaField label="Test request" value={prompt} onChange={event => setPrompt(event.target.value)} />
    <Button onClick={generate} disabled={busy || !prompt.trim()}>{busy ? "Working…" : "Download & generate"}</Button>
    {busy ? <Button variant="secondary" onClick={() => request.current?.abort()}>Stop</Button> : null}
    <p role="status" aria-live="polite" className="rounded-xl border border-cyan-200/30 bg-slate-950/40 p-3 text-sm text-cyan-100">{status || "Ready to start. No model files are downloaded until you click the button."}</p>
    {output ? <div className="min-w-0 max-w-full whitespace-pre-wrap break-words rounded-xl border border-white/20 p-4">{output}</div> : null}
  </div></Panel>;
}
