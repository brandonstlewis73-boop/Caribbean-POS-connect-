"use client";
import { useState } from "react";
import { generateLocalDraft } from "@/lib/local-ai";
import { LOCAL_AI_MODEL } from "@/lib/local-ai-config";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
export function LocalAiTestClient() {
  const [prompt, setPrompt] = useState("Write a short WhatsApp promotion for a Caribbean bakery's lunch special. Use placeholders for prices.");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [output, setOutput] = useState("");
  async function generate() {
    if (busy || !prompt.trim()) return;
    setBusy(true); setOutput("");
    try {
      const draft = await generateLocalDraft({ instructions: "You are a helpful Caribbean POS Connect test assistant. Write concise drafts. Do not invent business records or claim to perform actions. Ask for missing details. All outputs need human review.", input: prompt }, setStatus);
      setOutput(draft); setStatus("Local draft ready. Review before using.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Local generation failed."); }
    finally { setBusy(false); }
  }
  return <Panel><div className="space-y-4 p-5">
    <h2 className="text-xl font-bold">Test local AI</h2>
    <p className="text-sm">Model: {LOCAL_AI_MODEL}. Generation runs in this browser without API charges. This test uses only the text you enter; it does not load business records or change your subscription.</p>
    <p className="text-sm">The first run downloads roughly 1 GB, which is cached when browser storage permits. Use a compatible WebGPU browser with enough free device memory. Clicking Download &amp; generate starts the download. No paid fallback is enabled.</p>
    <TextAreaField label="Test request" value={prompt} onChange={event => setPrompt(event.target.value)} />
    <Button onClick={generate} disabled={busy || !prompt.trim()}>{busy ? "Working…" : "Download & generate"}</Button>
    <p role="status" aria-live="polite" className="text-sm">{status}</p>
    {output ? <div className="whitespace-pre-wrap rounded-xl border border-white/20 p-4">{output}</div> : null}
  </div></Panel>;
}
